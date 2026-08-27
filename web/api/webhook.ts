import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";

function getDb(): Firestore {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");
    const serviceAccount = JSON.parse(raw);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

async function findAccountBySubscription(db: Firestore, subscriptionId: string): Promise<string | null> {
  const snap = await db.collection("accounts").where("stripeSubscriptionId", "==", subscriptionId).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

/**
 * Recebe eventos do Stripe (pagamento confirmado, renovação, falha, cancelamento) e atualiza
 * accounts/{accountId} no Firestore sozinho — é isso que substitui "ficar vendo quem pagou".
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return new Response("Configuração do Stripe incompleta no servidor.", { status: 500 });
  }

  const stripe = new Stripe(secretKey);
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", webhookSecret);
  } catch (err) {
    console.error("Assinatura do webhook inválida", err);
    return new Response("Assinatura inválida", { status: 400 });
  }

  let db: Firestore;
  try {
    db = getDb();
  } catch (err) {
    console.error("Falha ao inicializar Firebase Admin", err);
    return new Response("Erro interno", { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const accountId = session.client_reference_id;
        const subscriptionId = session.subscription as string | null;
        if (accountId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await db.doc(`accounts/${accountId}`).set(
            {
              status: "active",
              subscriptionExpiresAt: Timestamp.fromMillis(subscription.current_period_end * 1000),
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscription.id,
            },
            { merge: true },
          );
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;
        if (subscriptionId) {
          const accountId = await findAccountBySubscription(db, subscriptionId);
          if (accountId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await db.doc(`accounts/${accountId}`).set(
              {
                status: "active",
                subscriptionExpiresAt: Timestamp.fromMillis(subscription.current_period_end * 1000),
              },
              { merge: true },
            );
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;
        if (subscriptionId) {
          const accountId = await findAccountBySubscription(db, subscriptionId);
          if (accountId) {
            await db.doc(`accounts/${accountId}`).set({ status: "payment_failed" }, { merge: true });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const accountId = await findAccountBySubscription(db, subscription.id);
        if (accountId) {
          await db.doc(`accounts/${accountId}`).set({ status: "suspended" }, { merge: true });
        }
        break;
      }
    }
  } catch (err) {
    console.error(`Falha ao processar evento ${event.type}`, err);
    return new Response("Erro ao processar evento", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

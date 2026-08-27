import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";

function getDb(): Firestore {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

async function resolveAccountId(
  db: Firestore,
  payment: { externalReference?: string; subscription?: string } | undefined,
): Promise<string | null> {
  if (!payment) return null;
  if (payment.externalReference) return payment.externalReference;
  if (!payment.subscription) return null;
  const snap = await db.collection("accounts").where("asaasSubscriptionId", "==", payment.subscription).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

function addDays(days: number): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return Timestamp.fromDate(d);
}

/**
 * Recebe eventos do Asaas (pagamento confirmado, atrasado, estornado) e atualiza
 * accounts/{accountId} no Firestore sozinho — substitui "ficar vendo quem pagou".
 * Autenticado pelo "Authentication Token" configurado no webhook do Asaas
 * (Configurações > Integrações > Webhooks), enviado no header `asaas-access-token`.
 */
export async function POST(req: Request): Promise<Response> {
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!webhookToken) {
    return new Response("Configuração do Asaas incompleta no servidor.", { status: 500 });
  }
  if (req.headers.get("asaas-access-token") !== webhookToken) {
    console.error("Token do webhook do Asaas inválido");
    return new Response("Token inválido", { status: 401 });
  }

  let event: { event?: string; payment?: { externalReference?: string; subscription?: string } };
  try {
    event = await req.json();
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  let db: Firestore;
  try {
    db = getDb();
  } catch (err) {
    console.error("Falha ao inicializar Firebase Admin", err);
    return new Response("Erro interno", { status: 500 });
  }

  try {
    switch (event.event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        const accountId = await resolveAccountId(db, event.payment);
        if (accountId) {
          const accountSnap = await db.doc(`accounts/${accountId}`).get();
          const graceDays = accountSnap.data()?.billingCycle === "anual" ? 380 : 35;
          await db.doc(`accounts/${accountId}`).set(
            { status: "active", subscriptionExpiresAt: addDays(graceDays) },
            { merge: true },
          );
        }
        break;
      }

      case "PAYMENT_OVERDUE": {
        const accountId = await resolveAccountId(db, event.payment);
        if (accountId) {
          await db.doc(`accounts/${accountId}`).set({ status: "payment_failed" }, { merge: true });
        }
        break;
      }

      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED": {
        const accountId = await resolveAccountId(db, event.payment);
        if (accountId) {
          await db.doc(`accounts/${accountId}`).set({ status: "suspended" }, { merge: true });
        }
        break;
      }
    }
  } catch (err) {
    console.error(`Falha ao processar evento ${event.event}`, err);
    return new Response("Erro ao processar evento", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

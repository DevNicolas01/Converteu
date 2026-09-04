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

function addDays(days: number): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return Timestamp.fromDate(d);
}

interface KiwifyOrder {
  order_status?: string;
  status?: string;
  customer?: { email?: string };
  tracking?: { s1?: string };
}

/**
 * Acha a conta do Firestore que corresponde ao pedido da Kiwify.
 *
 * 1) Confiável: `tracking.s1` -- a gente gruda o accountId no link de checkout na hora do
 *    redirecionamento pós-cadastro (ver SignupPage.tsx), e a Kiwify devolve esse valor de volta
 *    aqui no payload (é um parâmetro de rastreamento documentado na API deles).
 * 2) Reforço: casa pelo e-mail da compra, caso o s1 não tenha vindo por algum motivo (ex: alguém
 *    reenviou o link de checkout sem o parâmetro).
 */
async function resolveAccountId(db: Firestore, order: KiwifyOrder | undefined): Promise<string | null> {
  if (!order) return null;
  const s1 = order.tracking?.s1;
  if (s1) {
    const snap = await db.doc(`accounts/${s1}`).get();
    if (snap.exists) return s1;
  }
  const email = order.customer?.email?.trim().toLowerCase();
  if (!email) return null;
  const snap = await db.collection("accounts").where("email", "==", email).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

/**
 * Recebe eventos da Kiwify (compra aprovada, assinatura renovada/atrasada/cancelada, reembolso,
 * chargeback) e atualiza accounts/{accountId} no Firestore sozinho -- mesmo papel do webhook do
 * Asaas (web/api/webhook.ts), só que pra quem assina pela Kiwify.
 *
 * Autenticado por um token compartilhado, enviado como query string na própria URL do webhook
 * configurada no painel da Kiwify (Apps > Webhooks): .../api/kiwify-webhook?token=SEU_TOKEN.
 *
 * IMPORTANTE -- ainda precisa de um teste real: a Kiwify documenta os nomes dos eventos
 * (compra_aprovada, subscription_renewed, subscription_late, subscription_canceled,
 * compra_reembolsada, chargeback) e o formato do pedido (status, customer.email, tracking.s1),
 * mas não confirma publicamente se eventos de assinatura chegam no mesmo formato. Por isso todo
 * evento não reconhecido cai no `console.log` no final, sem quebrar nada -- depois do primeiro
 * evento de teste (o botão "Testar" no painel da Kiwify), dá pra ver nos logs da function no
 * Vercel o formato real e ajustar os nomes de campo abaixo se precisar.
 */
export async function POST(req: Request): Promise<Response> {
  const webhookToken = process.env.KIWIFY_WEBHOOK_TOKEN;
  if (!webhookToken) {
    return new Response("Configuração da Kiwify incompleta no servidor.", { status: 500 });
  }
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== webhookToken) {
    console.error("Token do webhook da Kiwify inválido");
    return new Response("Token inválido", { status: 401 });
  }

  let body: KiwifyOrder & { order?: KiwifyOrder; webhook_event_type?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  // A Kiwify pode mandar o pedido no nível raiz do corpo ou aninhado em "order", dependendo do
  // evento -- tenta os dois em vez de assumir um só.
  const order: KiwifyOrder = body.order || body;
  const status = (order.order_status || order.status || "").toLowerCase();
  const evento = req.headers.get("x-kiwify-event") || body.webhook_event_type || url.searchParams.get("event") || "";

  let db: Firestore;
  try {
    db = getDb();
  } catch (err) {
    console.error("Falha ao inicializar Firebase Admin", err);
    return new Response("Erro interno", { status: 500 });
  }

  try {
    const accountId = await resolveAccountId(db, order);
    if (!accountId) {
      console.error("Kiwify webhook: não achei a conta pro pedido", { status, evento, order });
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isPagamentoConfirmado = status === "paid" || status === "approved" || evento === "compra_aprovada" || evento === "subscription_renewed";
    const isPagamentoFalhou = status === "refused" || evento === "subscription_late";
    const isCancelamento =
      status === "refunded" ||
      status === "chargedback" ||
      evento === "compra_reembolsada" ||
      evento === "chargeback" ||
      evento === "subscription_canceled";

    if (isPagamentoConfirmado) {
      const accountSnap = await db.doc(`accounts/${accountId}`).get();
      // Grace period cobre o intervalo entre a cobrança e o próximo webhook de renovação --
      // igual ao webhook do Asaas, 35 dias pra mensal (30 + folga) e 380 pra anual.
      const graceDays = accountSnap.data()?.billingCycle === "anual" ? 380 : 35;
      await db.doc(`accounts/${accountId}`).set({ status: "active", subscriptionExpiresAt: addDays(graceDays) }, { merge: true });
    } else if (isPagamentoFalhou) {
      await db.doc(`accounts/${accountId}`).set({ status: "payment_failed" }, { merge: true });
    } else if (isCancelamento) {
      await db.doc(`accounts/${accountId}`).set({ status: "suspended" }, { merge: true });
    } else {
      console.log("Kiwify webhook: evento não tratado, só registrando pra referência", { status, evento, order });
    }
  } catch (err) {
    console.error(`Falha ao processar evento da Kiwify (${evento || "?"})`, err);
    return new Response("Erro ao processar evento", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

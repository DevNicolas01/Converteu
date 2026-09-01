import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

type PlanId = "start" | "cresce" | "sem_limite";
type BillingCycle = "mensal" | "anual";

// Precisa ficar em sincronia com PLANS/PLAN_PRICES em src/lib/calc.ts -- o Vercel não
// empacota imports de fora da pasta api/, cada function é transpilada isoladamente.
const PLAN_LABELS: Record<PlanId, string> = {
  start: "Start",
  cresce: "Converte",
  sem_limite: "Ilimitado",
};

const PLAN_PRICES: Record<PlanId, Record<BillingCycle, number>> = {
  start: { mensal: 24.9, anual: 249 },
  cresce: { mensal: 39.9, anual: 399 },
  sem_limite: { mensal: 59.9, anual: 599 },
};

function getDb(): Firestore {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

function asaasBaseUrl(): string {
  return process.env.ASAAS_ENV === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

async function asaasFetch(path: string, init: RequestInit = {}) {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada.");
  const res = await fetch(`${asaasBaseUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", access_token: apiKey, ...init.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Asaas ${path} falhou: ${JSON.stringify(data)}`);
  return data;
}

type AsaasPayment = { status: string; invoiceUrl: string };

/**
 * Cria (ou reaproveita) o cliente e a assinatura no Asaas pra uma conta assinar/renovar/trocar
 * de plano do Deal Shot, e devolve o link de pagamento (invoiceUrl) pro front-end redirecionar.
 * O plano "teste" é gratuito e nunca deveria chegar aqui (ativado direto no cadastro).
 */
export async function POST(req: Request): Promise<Response> {
  let body: {
    accountId?: string;
    email?: string;
    name?: string;
    cpfCnpj?: string;
    plan?: string;
    billingCycle?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const { accountId, email } = body;
  const rawPlan = body.plan;
  const billingCycle = (body.billingCycle as BillingCycle | undefined) || "mensal";
  if (!accountId || !email) {
    return new Response("accountId e email são obrigatórios", { status: 400 });
  }
  if (!rawPlan || !(rawPlan in PLAN_PRICES)) {
    return new Response("Plano inválido.", { status: 400 });
  }
  const plan = rawPlan as PlanId;
  if (billingCycle !== "mensal" && billingCycle !== "anual") {
    return new Response("Ciclo de cobrança inválido.", { status: 400 });
  }

  const value = PLAN_PRICES[plan][billingCycle];
  const planLabel = PLAN_LABELS[plan] || plan;

  try {
    const db = getDb();
    const accountRef = db.doc(`accounts/${accountId}`);
    const accountSnap = await accountRef.get();
    const data = accountSnap.data() || {};

    let customerId = data.asaasCustomerId as string | undefined;
    if (!customerId) {
      const cpfCnpj = (body.cpfCnpj || "").replace(/\D/g, "");
      if (!cpfCnpj) {
        return new Response("CPF ou CNPJ é obrigatório pra gerar a cobrança.", { status: 400 });
      }
      const customer = await asaasFetch("/customers", {
        method: "POST",
        body: JSON.stringify({ name: body.name || email, email, cpfCnpj, externalReference: accountId }),
      });
      customerId = customer.id as string;
      await accountRef.set({ asaasCustomerId: customerId }, { merge: true });
    }

    let subscriptionId = data.asaasSubscriptionId as string | undefined;
    const storedPlan = data.plan as string | undefined;
    const storedCycle = data.billingCycle as string | undefined;

    if (subscriptionId && storedPlan && (storedPlan !== plan || storedCycle !== billingCycle)) {
      try {
        await asaasFetch(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
      } catch (err) {
        console.error("Falha ao cancelar assinatura anterior no Asaas", err);
      }
      subscriptionId = undefined;
    }

    if (!subscriptionId) {
      const subscription = await asaasFetch("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          customer: customerId,
          billingType: "UNDEFINED",
          cycle: billingCycle === "anual" ? "YEARLY" : "MONTHLY",
          value,
          nextDueDate: new Date().toISOString().slice(0, 10),
          description: `Assinatura Deal Shot - ${planLabel} (${billingCycle})`,
          externalReference: accountId,
        }),
      });
      subscriptionId = subscription.id as string;
    }
    await accountRef.set({ asaasSubscriptionId: subscriptionId, plan, billingCycle }, { merge: true });

    const paymentsResp = await asaasFetch(`/payments?subscription=${subscriptionId}&limit=10`);
    const list = (paymentsResp?.data || []) as AsaasPayment[];
    const pending = list.find((p) => p.status === "PENDING" || p.status === "OVERDUE") || list[0];
    if (!pending?.invoiceUrl) {
      return new Response("Não foi possível gerar o link de pagamento.", { status: 500 });
    }

    return new Response(JSON.stringify({ url: pending.invoiceUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Falha ao criar cobrança no Asaas", err);
    return new Response("Não foi possível iniciar o pagamento.", { status: 500 });
  }
}

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";

// Chave pública do app Web do Firebase (a mesma embutida no bundle do front-end) — não é segredo.
const FIREBASE_WEB_API_KEY = "AIzaSyBuPf42fom45KZ6y3jl9i21UaKHsxobzwM";

// Precisa ficar em sincronia com PLANS em src/lib/calc.ts -- o Vercel não empacota imports
// de fora da pasta api/, cada function é transpilada isoladamente.
const PLAN_LIMITS: Record<string, number | null> = {
  teste: 3,
  start: 15,
  cresce: 40,
  sem_limite: null,
};

function getDb(): Firestore {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

async function verifyIdToken(idToken: string): Promise<string> {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json();
  const user = data?.users?.[0];
  if (!res.ok || !user) throw new Error("Token inválido.");
  return user.localId as string;
}

/**
 * Cria uma proposta em nome da conta autenticada, validando assinatura ativa e o limite
 * mensal do plano no servidor -- as regras do Firestore não conseguem contar quantos
 * documentos já existem numa subcoleção, então checar isso só no front-end (como era antes)
 * deixava qualquer pessoa com acesso ao SDK do Firebase criar orçamentos além do plano.
 */
export async function POST(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.replace(/^Bearer /, "");
  if (!idToken) {
    return new Response("Não autenticado.", { status: 401 });
  }

  let uid: string;
  try {
    uid = await verifyIdToken(idToken);
  } catch (err) {
    console.error("Token inválido", err);
    return new Response("Token inválido.", { status: 401 });
  }

  let body: { accountId?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response("JSON inválido.", { status: 400 });
  }
  const payload = body.payload;
  if (!payload) {
    return new Response("payload é obrigatório.", { status: 400 });
  }
  if (body.accountId && body.accountId !== uid) {
    return new Response("accountId não corresponde ao usuário autenticado.", { status: 403 });
  }

  let db: Firestore;
  try {
    db = getDb();
  } catch (err) {
    console.error("Falha ao inicializar Firebase Admin", err);
    return new Response("Erro interno", { status: 500 });
  }

  const accountSnap = await db.doc(`accounts/${uid}`).get();
  const account = accountSnap.data();
  if (!account) {
    return new Response("Conta não encontrada.", { status: 404 });
  }

  const expiresAt = (account.subscriptionExpiresAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? null;
  const isActive = account.status === "active" && !!expiresAt && expiresAt > new Date();
  if (!isActive) {
    return new Response("Assinatura inativa.", { status: 403 });
  }

  const limit = PLAN_LIMITS[account.plan as string] ?? null;
  if (limit != null) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const countSnap = await db
      .collection(`accounts/${uid}/proposals`)
      .where("criadoEm", ">=", Timestamp.fromDate(startOfMonth))
      .count()
      .get();
    if (countSnap.data().count >= limit) {
      return new Response(
        `Você atingiu o limite de ${limit} orçamentos neste mês do plano atual. Faça upgrade pra continuar criando orçamentos.`,
        { status: 403 },
      );
    }
  }

  try {
    const ref = await db.collection(`accounts/${uid}/proposals`).add({
      ...payload,
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
    });
    return new Response(JSON.stringify({ id: ref.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Falha ao criar proposta", err);
    return new Response("Falha ao criar a proposta.", { status: 500 });
  }
}

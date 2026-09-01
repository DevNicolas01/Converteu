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

/** Erro interno só pra sinalizar "limite atingido" de dentro da transação e devolver 403. */
class ProposalLimitReached extends Error {}

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
  const accountRef = db.doc(`accounts/${uid}`);
  const proposalsCol = db.collection(`accounts/${uid}/proposals`);

  try {
    let proposalId: string;

    if (limit != null && account.plan === "teste") {
      // O Teste é um limite vitalício (os 3 orçamentos do teste, e só) -- contar quantas
      // propostas existem *agora* deixava a pessoa apagar uma proposta pra abrir espaço e
      // criar outra na hora, girando o "trial" pra sempre. Por isso guardamos um contador que
      // só sobe (nunca desce quando apaga) em accounts/{uid}.proposalsCreatedCount, e criamos
      // a proposta + incrementamos o contador numa transação só, pra duas criações ao mesmo
      // tempo não furarem o limite.
      const proposalRef = proposalsCol.doc();
      await db.runTransaction(async (tx) => {
        const freshAccountSnap = await tx.get(accountRef);
        let used = freshAccountSnap.data()?.proposalsCreatedCount as number | undefined;
        if (used == null) {
          // Conta criada antes desse contador existir -- usa quantas propostas ela já tem
          // agora como ponto de partida, em vez de assumir zero (senão o limite "reseta").
          const existingSnap = await tx.get(proposalsCol.count());
          used = existingSnap.data().count;
        }
        if (used >= limit) {
          throw new ProposalLimitReached();
        }
        tx.set(proposalRef, { ...payload, criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });
        tx.set(accountRef, { proposalsCreatedCount: used + 1 }, { merge: true });
      });
      proposalId = proposalRef.id;
    } else {
      if (limit != null) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const countSnap = await proposalsCol.where("criadoEm", ">=", Timestamp.fromDate(startOfMonth)).count().get();
        if (countSnap.data().count >= limit) {
          throw new ProposalLimitReached();
        }
      }
      const ref = await proposalsCol.add({ ...payload, criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });
      proposalId = ref.id;
    }

    return new Response(JSON.stringify({ id: proposalId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof ProposalLimitReached) {
      const periodLabel = account.plan === "teste" ? "no total do plano Teste" : "neste mês";
      return new Response(
        `Você atingiu o limite de ${limit} orçamentos ${periodLabel}. Faça upgrade pra continuar criando orçamentos.`,
        { status: 403 },
      );
    }
    console.error("Falha ao criar proposta", err);
    return new Response("Falha ao criar a proposta.", { status: 500 });
  }
}

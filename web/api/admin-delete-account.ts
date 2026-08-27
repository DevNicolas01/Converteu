import { initializeApp, cert, getApps, getApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Chave pública do app Web do Firebase (a mesma embutida no bundle do front-end) — não é segredo.
const FIREBASE_WEB_API_KEY = "AIzaSyBuPf42fom45KZ6y3jl9i21UaKHsxobzwM";

let serviceAccount: ServiceAccount & { project_id: string };

function init() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");
    serviceAccount = JSON.parse(raw);
    initializeApp({ credential: cert(serviceAccount) });
  }
}

/**
 * Verifica o ID token via REST (accounts:lookup) em vez de firebase-admin/auth: essa parte da
 * lib puxa jwks-rsa -> jose (ESM) e derruba a function inteira no runtime do Vercel
 * (Error [ERR_REQUIRE_ESM]). A REST API evita esse módulo por completo.
 */
async function verifyIdTokenRest(idToken: string): Promise<{ uid: string; isAdminClaim: boolean }> {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json();
  const user = data?.users?.[0];
  if (!res.ok || !user) throw new Error("Token inválido.");
  let isAdminClaim = false;
  if (user.customAttributes) {
    try {
      isAdminClaim = JSON.parse(user.customAttributes).admin === true;
    } catch {
      isAdminClaim = false;
    }
  }
  return { uid: user.localId as string, isAdminClaim };
}

async function isCallerAdmin(idToken: string): Promise<boolean> {
  const { uid, isAdminClaim } = await verifyIdTokenRest(idToken);
  if (isAdminClaim) return true;
  const snap = await getFirestore().doc(`admins/${uid}`).get();
  return snap.exists;
}

/** Apaga o login no Firebase Auth via REST Admin API, usando o access token da service account. */
async function deleteAuthUser(uid: string): Promise<void> {
  const app = getApp();
  const { access_token: accessToken } = await app.options.credential!.getAccessToken();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${serviceAccount.project_id}/accounts:delete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ localId: uid }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha ao apagar login: ${text}`);
  }
}

/**
 * Apaga uma conta de cliente por completo: dados no Firestore (propostas, perfil da
 * empresa) E o login no Firebase Auth. O app (client-side) só conseguia apagar os dados —
 * apagar o login de outra pessoa exige acesso de admin, por isso isso mora numa function aqui.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    init();
  } catch (err) {
    console.error("Falha ao inicializar Firebase Admin", err);
    return new Response("Configuração do servidor incompleta.", { status: 500 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.replace(/^Bearer /, "");
  if (!idToken) {
    return new Response("Não autenticado.", { status: 401 });
  }

  let admin = false;
  try {
    admin = await isCallerAdmin(idToken);
  } catch (err) {
    console.error("Token inválido", err);
    return new Response("Token inválido.", { status: 401 });
  }
  if (!admin) {
    return new Response("Só admins podem excluir contas.", { status: 403 });
  }

  let body: { accountId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("JSON inválido.", { status: 400 });
  }
  const { accountId } = body;
  if (!accountId) {
    return new Response("accountId é obrigatório.", { status: 400 });
  }

  const db = getFirestore();
  try {
    for (const sub of ["companyProfile", "proposals", "emailLogs"]) {
      const snap = await db.collection(`accounts/${accountId}/${sub}`).get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    }
    await db.doc(`accounts/${accountId}`).delete();
  } catch (err) {
    console.error("Falha ao apagar dados da conta", err);
    return new Response("Falha ao apagar os dados da conta.", { status: 500 });
  }

  try {
    await deleteAuthUser(accountId);
  } catch (err) {
    // Dados já foram apagados; login pode já não existir (ou já ter sido removido antes).
    console.error("Falha ao apagar o login (dados já foram apagados)", err);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

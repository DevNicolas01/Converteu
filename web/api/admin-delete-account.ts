import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function init() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
}

async function isCallerAdmin(idToken: string): Promise<boolean> {
  const decoded = await getAuth().verifyIdToken(idToken);
  if (decoded.admin === true) return true;
  const snap = await getFirestore().doc(`admins/${decoded.uid}`).get();
  return snap.exists;
}

/**
 * Apaga uma conta de cliente por completo: dados no Firestore (propostas, perfil da
 * empresa) E o login no Firebase Auth. O app (client-side) só conseguia apagar os dados —
 * apagar o login de outra pessoa exige o Admin SDK, por isso isso mora numa function aqui.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

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
    await getAuth().deleteUser(accountId);
  } catch (err) {
    // Dados já foram apagados; login pode já não existir (ou já ter sido removido antes).
    console.error("Falha ao apagar o login (dados já foram apagados)", err);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

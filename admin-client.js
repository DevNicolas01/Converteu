import { auth, db } from "./firebase-client.js";
import { firebaseConfig } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Mesmos ids de estágio definidos em app.js (STAGES) — duplicado aqui de propósito:
// app.js é script clássico (não-module), então não dá pra importar isso de lá.
const CLOSED_STAGE = "fechado";
const LOST_STAGE = "perdido";

/** Confirma (via refresh de token) se o usuário logado tem a custom claim admin. */
async function isCurrentUserAdmin() {
  if (!auth.currentUser) return false;
  await auth.currentUser.getIdToken(true);
  const { claims } = await auth.currentUser.getIdTokenResult();
  return claims.admin === true;
}

/** Lista todas as contas de clientes (as regras liberam leitura total pra quem tem a claim admin). */
async function adminListAccounts() {
  const snap = await getDocs(collection(db, "accounts"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cria o usuário de autenticação num app Firebase secundário (mesmo projeto), pra não
 * derrubar a sessão do admin que está logado no app principal. Sem isso, criar um usuário
 * pelo SDK client-side loga automaticamente nele, substituindo a sessão do admin. A senha
 * é só um valor temporário aleatório — o dono da conta nunca chega a saber ela, porque
 * define a própria senha pelo e-mail de redefinição enviado logo em seguida.
 */
async function createAuthUserWithoutSignIn(email) {
  const secondaryApp = initializeApp(firebaseConfig, `admin-create-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  const tempPassword = crypto.randomUUID();
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
    const uid = cred.user.uid;
    await signOut(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

/**
 * Cria uma conta de cliente nova: usuário de auth (com senha temporária descartável) +
 * doc em accounts/{uid}, direto via Firestore (as regras liberam write pra quem tem a
 * claim admin). accountId == uid do dono, por convenção. Em seguida dispara o e-mail de
 * redefinição de senha do Firebase, pra o cliente escolher a própria senha.
 */
async function adminCreateAccount({ companyName, email, subscriptionMonths = 1 }) {
  const uid = await createAuthUserWithoutSignIn(email);
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + subscriptionMonths);
  await setDoc(doc(db, "accounts", uid), {
    companyName,
    email,
    ownerUid: uid,
    status: "active",
    subscriptionExpiresAt: Timestamp.fromDate(expiresAt),
    createdAt: Timestamp.now(),
  });
  await sendPasswordResetEmail(auth, email);
  return { accountId: uid };
}

async function getAccountExpiry(accountId) {
  const snap = await getDoc(doc(db, "accounts", accountId));
  return snap.data()?.subscriptionExpiresAt?.toDate?.() ?? null;
}

/** Estende a data de expiração da assinatura de uma conta (update direto, regras liberam admin). */
async function adminRenewSubscription(accountId, months, { fromNow = false } = {}) {
  const base = fromNow ? new Date() : (await getAccountExpiry(accountId)) || new Date();
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  await updateDoc(doc(db, "accounts", accountId), {
    subscriptionExpiresAt: Timestamp.fromDate(next),
    status: "active",
  });
}

/** Ativa ou suspende uma conta. */
async function adminSetAccountStatus(accountId, status) {
  await updateDoc(doc(db, "accounts", accountId), { status });
}

/**
 * Métricas por conta, calculadas direto no cliente a partir das propostas (admin tem
 * leitura liberada em accounts/*/proposals pelas regras). Sem Cloud Function.
 */
async function adminGetDashboardStats() {
  const accounts = await adminListAccounts();
  return Promise.all(accounts.map(async (acc) => {
    const snap = await getDocs(collection(db, "accounts", acc.id, "proposals"));
    let totalPropostas = 0;
    let abertas = 0;
    let fechados = 0;
    let valorTotalFechado = 0;
    let valorEmAberto = 0;
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const valor = Number(data.valor) || 0;
      totalPropostas += 1;
      if (data.status === CLOSED_STAGE) {
        fechados += 1;
        valorTotalFechado += valor;
      } else if (data.status !== LOST_STAGE) {
        abertas += 1;
        valorEmAberto += valor;
      }
    });
    return { accountId: acc.id, totalPropostas, abertas, fechados, valorTotalFechado, valorEmAberto };
  }));
}

window.OrceiAdmin = {
  isCurrentUserAdmin,
  adminListAccounts,
  adminCreateAccount,
  adminRenewSubscription,
  adminSetAccountStatus,
  adminGetDashboardStats,
};

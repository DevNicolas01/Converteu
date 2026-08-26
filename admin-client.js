import { auth, db, functions } from "./firebase-client.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";

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

/** Cria uma conta de cliente nova via Cloud Function. */
async function adminCreateAccount({ companyName, email, password, subscriptionMonths = 1 }) {
  const fn = httpsCallable(functions, "adminCreateAccount");
  const { data } = await fn({ companyName, email, password, subscriptionMonths });
  return data;
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

/** Busca as métricas agregadas de todos os clientes via Cloud Function. */
async function adminGetDashboardStats() {
  const fn = httpsCallable(functions, "adminDashboardStats");
  const { data } = await fn();
  return data;
}

window.OrceiAdmin = {
  isCurrentUserAdmin,
  adminListAccounts,
  adminCreateAccount,
  adminRenewSubscription,
  adminSetAccountStatus,
  adminGetDashboardStats,
};

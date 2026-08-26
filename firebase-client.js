import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  connectAuthEmulator,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getStorage,
  connectStorageEmulator,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "southamerica-east1");

// Em dev local (localhost/127.0.0.1), conecta nos emuladores em vez do projeto real —
// não depende de credenciais de produção nem do plano Blaze pra testar o app inteiro.
if (["localhost", "127.0.0.1"].includes(location.hostname)) {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
  connectStorageEmulator(storage, "localhost", 9199);
  connectFunctionsEmulator(functions, "localhost", 5001);
}

/** URL da function googleOAuthStart, assumindo a região southamerica-east1. */
function getGoogleOAuthStartUrl() {
  return `https://southamerica-east1-${firebaseConfig.projectId}.cloudfunctions.net/googleOAuthStart`;
}

let currentAccountId = null;
let currentIsAdmin = false;

async function refreshClaims() {
  const user = auth.currentUser;
  if (!user) {
    currentAccountId = null;
    currentIsAdmin = false;
    return;
  }
  await user.getIdToken(true);
  const { claims } = await user.getIdTokenResult();
  currentAccountId = claims.accountId ?? null;
  currentIsAdmin = claims.admin === true;
}

function requireAccountId() {
  if (!currentAccountId) throw new Error("Nenhuma conta associada ao usuário logado.");
  return currentAccountId;
}

/** Faz login com e-mail e senha, atualizando accountId/admin a partir das custom claims. */
async function login(email, senha) {
  await signInWithEmailAndPassword(auth, email, senha);
  await refreshClaims();
}

/** Encerra a sessão atual. */
async function logout() {
  currentAccountId = null;
  currentIsAdmin = false;
  await signOut(auth);
}

/** Observa mudanças de autenticação; cb recebe o objeto user (ou null). */
function onAuthStateChange(cb) {
  return onAuthStateChanged(auth, async (user) => {
    await refreshClaims();
    cb(user);
  });
}

/** Lê o status da assinatura da conta logada. */
async function getAccountStatus() {
  const accountId = requireAccountId();
  const snap = await getDoc(doc(db, "accounts", accountId));
  if (!snap.exists()) throw new Error("Conta não encontrada.");
  const data = snap.data();
  const expiresAt = data.subscriptionExpiresAt?.toDate?.() ?? null;
  const isExpired = expiresAt ? expiresAt < new Date() : true;
  const isSuspended = data.status !== "active";
  return {
    ...data,
    subscriptionExpiresAt: expiresAt,
    isExpired,
    isSuspended,
    isActiveAndValid: !isExpired && !isSuspended,
  };
}

/** Lança um erro com code = "SUBSCRIPTION_BLOCKED" se a assinatura não estiver ativa/em dia. */
async function requireActiveSubscription() {
  const status = await getAccountStatus();
  if (!status.isActiveAndValid) {
    const err = new Error("Assinatura vencida ou suspensa.");
    err.code = "SUBSCRIPTION_BLOCKED";
    throw err;
  }
  return status;
}

function proposalsCol() {
  const accountId = requireAccountId();
  return collection(db, "accounts", accountId, "proposals");
}

// O objeto "deal" usado pelo resto do app (app.js) já tem seu próprio formato
// (clientName, stage, valorFinal, metragem, ...). Guardamos ele inteiro em `dados`
// e replicamos clienteNome/status/valor no nível raiz só pra consultas/relatórios
// do painel admin (adminDashboardStats lê esses 3 campos direto).
function toProposalPayload(dealLike) {
  const { id, ...rest } = dealLike;
  return {
    clienteNome: dealLike.clientName || "",
    clienteEmail: dealLike.clienteEmail || null,
    status: dealLike.stage || "contato_inicial",
    valor: Number(dealLike.valorFinal) || 0,
    dados: rest,
  };
}

function fromProposalDoc(id, data) {
  return {
    ...(data.dados || {}),
    id,
    clientName: data.clienteNome,
    stage: data.status,
    valorFinal: data.valor,
  };
}

/** Lista todas as propostas da conta logada, já no formato "deal" usado pelo app. */
async function listProposals() {
  const snap = await getDocs(proposalsCol());
  return snap.docs.map((d) => fromProposalDoc(d.id, d.data()));
}

/** Cria uma proposta nova a partir do objeto "deal" (formato do antigo deals-v2). Retorna o id gerado. */
async function createProposal(dealLike) {
  const payload = {
    ...toProposalPayload(dealLike),
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };
  const ref = await addDoc(proposalsCol(), payload);
  return ref.id;
}

/** Sobrescreve uma proposta existente com o "deal" completo (não é um patch parcial). */
async function updateProposal(id, dealLike) {
  const accountId = requireAccountId();
  const payload = { ...toProposalPayload(dealLike), atualizadoEm: serverTimestamp() };
  await updateDoc(doc(db, "accounts", accountId, "proposals", id), payload);
}

/** Remove uma proposta. */
async function deleteProposal(id) {
  const accountId = requireAccountId();
  await deleteDoc(doc(db, "accounts", accountId, "proposals", id));
}

/** Lê o perfil de empresa (nome + logo) da conta logada. */
async function getCompanyProfile() {
  const accountId = requireAccountId();
  const snap = await getDoc(doc(db, "accounts", accountId, "companyProfile", "profile"));
  return snap.exists() ? snap.data() : { companyName: "", logoUrl: null };
}

/** Salva o nome de exibição da empresa. */
async function saveCompanyProfile({ companyName }) {
  const accountId = requireAccountId();
  await setDoc(doc(db, "accounts", accountId, "companyProfile", "profile"), { companyName }, { merge: true });
}

/** Sobe a logo pro Storage e salva a URL resultante no perfil da empresa. */
async function uploadCompanyLogo(file) {
  const accountId = requireAccountId();
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const fileRef = ref(storage, `company-logos/${accountId}/logo.${ext}`);
  await uploadBytes(fileRef, file);
  const logoUrl = await getDownloadURL(fileRef);
  await setDoc(doc(db, "accounts", accountId, "companyProfile", "profile"), { logoUrl }, { merge: true });
  return logoUrl;
}

/** Remove a logo do perfil da empresa (não apaga o arquivo do Storage, só o vínculo). */
async function clearCompanyLogo() {
  const accountId = requireAccountId();
  await setDoc(doc(db, "accounts", accountId, "companyProfile", "profile"), { logoUrl: null }, { merge: true });
}

/** Redireciona para o fluxo OAuth do Google Calendar. googleOAuthStartUrl vem do deploy das functions. */
function connectGoogleCalendar(googleOAuthStartUrl) {
  const accountId = requireAccountId();
  window.location.href = `${googleOAuthStartUrl}?accountId=${encodeURIComponent(accountId)}`;
}

/** Cria um evento no Google Calendar vinculado a uma proposta, via Cloud Function. */
async function createCalendarEvent(payload) {
  const accountId = requireAccountId();
  const fn = httpsCallable(functions, "createCalendarEvent");
  const { data } = await fn({ accountId, ...payload });
  return data;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Envia o PDF de uma proposta por e-mail, via Cloud Function (usa provedor transacional). */
async function sendProposalEmail({ proposalId, destinatario, assunto, mensagem, pdfBlob, pdfFileName }) {
  const accountId = requireAccountId();
  const pdfBase64 = await blobToBase64(pdfBlob);
  const fn = httpsCallable(functions, "sendProposalEmail");
  const { data } = await fn({ accountId, proposalId, destinatario, assunto, mensagem, pdfBase64, pdfFileName });
  return data;
}

/** Monta um link wa.me para compartilhar a proposta manualmente — sem envio automático. */
function buildWhatsAppShareLink(numero, mensagem) {
  const digits = String(numero).replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`;
}

const MIGRATION_FLAG = "orcei-migrated-v1";

/** Migra os dados antigos do localStorage (deals-v2 / orcei-company) para o Firestore. Roda uma vez por navegador. */
async function migrateFromLocalStorage() {
  if (localStorage.getItem(MIGRATION_FLAG) === "done") return { migrated: false };

  let dealsCount = 0;
  try {
    const rawDeals = localStorage.getItem("deals-v2");
    if (rawDeals) {
      const deals = JSON.parse(rawDeals);
      for (const deal of deals) {
        await createProposal(deal);
        dealsCount += 1;
      }
    }

    const rawCompany = localStorage.getItem("orcei-company");
    if (rawCompany) {
      const { name, logoBase64 } = JSON.parse(rawCompany);
      if (name) await saveCompanyProfile({ companyName: name });
      if (logoBase64) {
        const blob = await (await fetch(logoBase64)).blob();
        const file = new File([blob], "logo.png", { type: blob.type || "image/png" });
        await uploadCompanyLogo(file);
      }
    }

    localStorage.setItem(MIGRATION_FLAG, "done");
    return { migrated: true, dealsCount };
  } catch (err) {
    console.error("Falha na migração do localStorage:", err);
    throw err;
  }
}

window.OrceiDB = {
  login,
  logout,
  onAuthStateChange,
  getAccountStatus,
  requireActiveSubscription,
  listProposals,
  createProposal,
  updateProposal,
  deleteProposal,
  getCompanyProfile,
  saveCompanyProfile,
  uploadCompanyLogo,
  clearCompanyLogo,
  connectGoogleCalendar,
  getGoogleOAuthStartUrl,
  createCalendarEvent,
  sendProposalEmail,
  buildWhatsAppShareLink,
  migrateFromLocalStorage,
  isAdmin: () => currentIsAdmin,
};

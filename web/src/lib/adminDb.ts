import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { auth, db, firebaseConfig } from "./firebase";

const CLOSED_STAGE = "fechado";
const LOST_STAGE = "perdido";

export interface AdminAccount {
  id: string;
  companyName?: string;
  email?: string;
  status?: string;
  plan?: string;
  subscriptionExpiresAt?: { toDate?: () => Date } | Date | null;
  [key: string]: unknown;
}

export interface AdminAccountStats {
  accountId: string;
  totalPropostas: number;
  abertas: number;
  fechados: number;
  perdidos: number;
  valorTotalFechado: number;
  valorEmAberto: number;
  ticketMedio: number;
  taxaConversao: number;
  lastActivity: Date | null;
  /** Quantas propostas (e quantas fechadas) vieram de tráfego pago do Google. */
  trafegoPagoGoogle: { total: number; fechados: number };
  /** Quantas propostas (e quantas fechadas) vieram de tráfego pago do Meta. */
  trafegoPagoMeta: { total: number; fechados: number };
}

/** Lista todas as contas de clientes (as regras liberam leitura total pra quem tem a claim admin). */
export async function adminListAccounts(): Promise<AdminAccount[]> {
  const snap = await getDocs(collection(db, "accounts"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AdminAccount);
}

/**
 * Cria o usuário de autenticação num app Firebase secundário, pra não derrubar a sessão
 * do admin. A senha é um valor temporário aleatório — o dono da conta nunca chega a saber
 * ela, porque define a própria senha pelo e-mail de redefinição enviado em seguida.
 */
async function createAuthUserWithoutSignIn(email: string) {
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

export interface AdminEntry {
  uid: string;
  email?: string;
  addedAt?: { toDate?: () => Date } | null;
}

/** Lista os admins com acesso (docs em admins/*, mais o próprio admin logado se for por custom claim). */
export async function adminListAdmins(): Promise<AdminEntry[]> {
  const snap = await getDocs(collection(db, "admins"));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as { email?: string; addedAt?: { toDate?: () => Date } }) }));
}

/**
 * Adiciona um novo admin: cria o usuário de auth (senha temporária + e-mail de redefinição,
 * mesmo fluxo de adminCreateAccount) e grava admins/{uid} — as regras liberam isAdmin() pra
 * quem tem esse doc, então isso já dá acesso total de admin, sem precisar de Admin SDK.
 */
export async function adminAddAdmin(email: string) {
  const uid = await createAuthUserWithoutSignIn(email);
  await setDoc(doc(db, "admins", uid), { email, addedAt: Timestamp.now() });
  await sendPasswordResetEmail(auth, email);
  return { uid };
}

/** Remove o acesso de admin de alguém (não afeta a claim do admin original criado via script). */
export async function adminRemoveAdmin(uid: string) {
  await deleteDoc(doc(db, "admins", uid));
}

async function getAccountExpiry(accountId: string) {
  const snap = await getDoc(doc(db, "accounts", accountId));
  const data = snap.data() as { subscriptionExpiresAt?: { toDate?: () => Date } } | undefined;
  return data?.subscriptionExpiresAt?.toDate?.() ?? null;
}

export async function adminRenewSubscription(accountId: string, months: number) {
  const base = (await getAccountExpiry(accountId)) || new Date();
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  await updateDoc(doc(db, "accounts", accountId), {
    subscriptionExpiresAt: Timestamp.fromDate(next),
    status: "active",
  });
}

export async function adminSetAccountStatus(accountId: string, status: string) {
  await updateDoc(doc(db, "accounts", accountId), { status });
}

/**
 * Apaga os dados da conta (empresa, propostas, logs de e-mail). O login do cliente no
 * Firebase Auth continua existindo (só o Admin SDK consegue apagar login de outra pessoa,
 * o que exigiria Blaze) — mas sem doc em accounts/{id}, ele não consegue mais entrar em
 * nada: cai direto em "conta não encontrada".
 */
/**
 * Apaga a conta (dados + login) via backend — apagar o login de outra pessoa exige o
 * Admin SDK, o client-side só conseguiria apagar os dados e deixaria o e-mail "preso".
 */
export async function adminDeleteAccount(accountId: string) {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Não autenticado.");
  const res = await fetch("/api/admin-delete-account", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ accountId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Falha ao excluir conta.");
  }
}

export interface AdminCompanyProfile {
  companyName?: string;
  logoUrl?: string | null;
}

/**
 * Perfil de empresa (nome de exibição + logo) de cada conta. Fica em accounts/{id}/companyProfile/profile
 * e é o que o próprio cliente edita em "Dados da empresa" — pode divergir do accounts/{id}.companyName
 * (que só existe com o valor original de quando a conta foi criada), então o admin usa este pra exibir
 * o nome/logo atualizados.
 */
export async function adminGetCompanyProfiles(accountIds: string[]): Promise<Record<string, AdminCompanyProfile>> {
  const entries = await Promise.all(
    accountIds.map(async (id) => {
      const snap = await getDoc(doc(db, "accounts", id, "companyProfile", "profile"));
      return [id, snap.exists() ? (snap.data() as AdminCompanyProfile) : {}] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/** Métricas por conta, calculadas direto no cliente a partir das propostas. Sem Cloud Function. */
export async function adminGetDashboardStats(): Promise<AdminAccountStats[]> {
  const accounts = await adminListAccounts();
  return Promise.all(
    accounts.map(async (acc) => {
      const snap = await getDocs(collection(db, "accounts", acc.id, "proposals"));
      let totalPropostas = 0;
      let abertas = 0;
      let fechados = 0;
      let perdidos = 0;
      let valorTotalFechado = 0;
      let valorEmAberto = 0;
      let lastActivity: Date | null = null;
      let googlePagoTotal = 0;
      let googlePagoFechados = 0;
      let metaPagoTotal = 0;
      let metaPagoFechados = 0;
      snap.forEach((docSnap) => {
        const data = docSnap.data() as {
          status?: string;
          valor?: number;
          criadoEm?: { toDate?: () => Date };
          atualizadoEm?: { toDate?: () => Date };
          dados?: { leadSource?: string; leadSourcePaidChannel?: string };
        };
        const valor = Number(data.valor) || 0;
        const isClosed = data.status === CLOSED_STAGE;
        totalPropostas += 1;
        if (isClosed) {
          fechados += 1;
          valorTotalFechado += valor;
        } else if (data.status === LOST_STAGE) {
          perdidos += 1;
        } else {
          abertas += 1;
          valorEmAberto += valor;
        }
        if (data.dados?.leadSource === "Tráfego pago") {
          if (data.dados.leadSourcePaidChannel === "Google") {
            googlePagoTotal += 1;
            if (isClosed) googlePagoFechados += 1;
          } else if (data.dados.leadSourcePaidChannel === "Meta") {
            metaPagoTotal += 1;
            if (isClosed) metaPagoFechados += 1;
          }
        }
        const touched = data.atualizadoEm?.toDate?.() || data.criadoEm?.toDate?.() || null;
        if (touched && (!lastActivity || touched > lastActivity)) lastActivity = touched;
      });
      const ticketMedio = fechados ? valorTotalFechado / fechados : 0;
      const taxaConversao = totalPropostas ? (fechados / totalPropostas) * 100 : 0;
      return {
        accountId: acc.id,
        totalPropostas,
        abertas,
        fechados,
        perdidos,
        valorTotalFechado,
        valorEmAberto,
        ticketMedio,
        taxaConversao,
        lastActivity,
        trafegoPagoGoogle: { total: googlePagoTotal, fechados: googlePagoFechados },
        trafegoPagoMeta: { total: metaPagoTotal, fechados: metaPagoFechados },
      };
    }),
  );
}

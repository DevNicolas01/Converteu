import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type { Deal } from "./calc";

export interface AccountStatus {
  companyName?: string;
  email?: string;
  status?: string;
  subscriptionExpiresAt: Date | null;
  isExpired: boolean;
  isSuspended: boolean;
  isActiveAndValid: boolean;
}

/** Lê o status/assinatura de uma conta (mesma lógica de firebase-client.js: getAccountStatus). */
export async function getAccountStatus(accountId: string): Promise<AccountStatus> {
  const snap = await getDoc(doc(db, "accounts", accountId));
  if (!snap.exists()) throw new Error("Conta não encontrada.");
  const data = snap.data() as Record<string, unknown>;
  const expiresAt = (data.subscriptionExpiresAt as { toDate?: () => Date })?.toDate?.() ?? null;
  const isExpired = expiresAt ? expiresAt < new Date() : true;
  const isSuspended = data.status !== "active";
  return {
    ...(data as object),
    subscriptionExpiresAt: expiresAt,
    isExpired,
    isSuspended,
    isActiveAndValid: !isExpired && !isSuspended,
  };
}

function proposalsCol(accountId: string) {
  return collection(db, "accounts", accountId, "proposals");
}

// Mesmo formato "deal" usado no app antigo (app.js): guardamos o objeto inteiro em `dados`
// e replicamos clienteNome/status/valor no nível raiz pra leitura rápida (usado pelas
// métricas do admin em adminGetDashboardStats).
export function toProposalPayload(dealLike: Deal) {
  const { id: _id, ...rest } = dealLike;
  return {
    clienteNome: dealLike.clientName || "",
    clienteEmail: dealLike.clienteEmail || null,
    status: dealLike.stage || "aberto",
    valor: Number(dealLike.valorFinal) || 0,
    dados: rest,
  };
}

export function fromProposalDoc(id: string, data: Record<string, unknown>) {
  return {
    ...((data.dados as object) || {}),
    id,
    clientName: data.clienteNome,
    stage: data.status,
    valorFinal: data.valor,
  };
}

export async function listProposals(accountId: string) {
  const snap = await getDocs(proposalsCol(accountId));
  return snap.docs.map((d) => fromProposalDoc(d.id, d.data()));
}

export async function createProposal(accountId: string, dealLike: Deal) {
  const payload = {
    ...toProposalPayload(dealLike),
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };
  const ref2 = await addDoc(proposalsCol(accountId), payload);
  return ref2.id;
}

export async function updateProposal(accountId: string, id: string, dealLike: Deal) {
  const payload = { ...toProposalPayload(dealLike), atualizadoEm: serverTimestamp() };
  await updateDoc(doc(db, "accounts", accountId, "proposals", id), payload);
}

export async function deleteProposal(accountId: string, id: string) {
  await deleteDoc(doc(db, "accounts", accountId, "proposals", id));
}

export interface CompanyProfile {
  companyName?: string;
  logoUrl?: string | null;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
}

export async function getCompanyProfile(accountId: string): Promise<CompanyProfile> {
  const snap = await getDoc(doc(db, "accounts", accountId, "companyProfile", "profile"));
  return snap.exists() ? (snap.data() as CompanyProfile) : { companyName: "", logoUrl: null };
}

export async function saveCompanyProfile(accountId: string, data: Omit<CompanyProfile, "logoUrl">) {
  await setDoc(doc(db, "accounts", accountId, "companyProfile", "profile"), data, { merge: true });
}

export async function uploadCompanyLogo(accountId: string, file: File) {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const fileRef = ref(storage, `company-logos/${accountId}/logo.${ext}`);
  await uploadBytes(fileRef, file);
  const logoUrl = await getDownloadURL(fileRef);
  await setDoc(doc(db, "accounts", accountId, "companyProfile", "profile"), { logoUrl }, { merge: true });
  return logoUrl;
}

export async function clearCompanyLogo(accountId: string) {
  await setDoc(doc(db, "accounts", accountId, "companyProfile", "profile"), { logoUrl: null }, { merge: true });
}

export function buildWhatsAppShareLink(numero: string, mensagem: string) {
  const digits = String(numero).replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`;
}

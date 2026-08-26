// Cria o 1º admin (+ opcionalmente uma conta de teste) direto no Firestore/Auth,
// usando o Admin SDK com uma service account — não precisa do plano Blaze nem de
// nenhuma Cloud Function publicada. Ver PROMPTCLAUDECODE.md seção 3.1.
//
// Uso:
//   BOOTSTRAP_ADMIN_EMAIL=admin@empresa.com BOOTSTRAP_ADMIN_PASSWORD=senha-forte \
//   BOOTSTRAP_TEST_ACCOUNT_EMAIL=teste@cliente.com BOOTSTRAP_TEST_ACCOUNT_PASSWORD=senha-forte \
//   node scripts/bootstrap-local.mjs
//
// Requer um service-account.json na raiz do projeto (Project Settings > Service
// accounts > Generate new private key). Esse arquivo é gitignored — nunca commitar.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const serviceAccountPath = fileURLToPath(new URL("../service-account.json", import.meta.url));
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const {
  BOOTSTRAP_ADMIN_EMAIL,
  BOOTSTRAP_ADMIN_PASSWORD,
  BOOTSTRAP_TEST_ACCOUNT_EMAIL,
  BOOTSTRAP_TEST_ACCOUNT_PASSWORD,
} = process.env;

if (!BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_PASSWORD) {
  throw new Error("Defina BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD no ambiente antes de rodar.");
}

const adminUser = await auth.createUser({
  email: BOOTSTRAP_ADMIN_EMAIL,
  password: BOOTSTRAP_ADMIN_PASSWORD,
  emailVerified: true,
});
await auth.setCustomUserClaims(adminUser.uid, { admin: true });
await db.doc(`admins/${adminUser.uid}`).set({ role: "admin" });
console.log(`Admin criado: ${BOOTSTRAP_ADMIN_EMAIL} (uid ${adminUser.uid})`);

if (BOOTSTRAP_TEST_ACCOUNT_EMAIL && BOOTSTRAP_TEST_ACCOUNT_PASSWORD) {
  const testUser = await auth.createUser({
    email: BOOTSTRAP_TEST_ACCOUNT_EMAIL,
    password: BOOTSTRAP_TEST_ACCOUNT_PASSWORD,
    emailVerified: true,
  });
  const accountId = testUser.uid;
  await auth.setCustomUserClaims(testUser.uid, { accountId });

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  await db.doc(`accounts/${accountId}`).set({
    companyName: "Conta de teste",
    email: BOOTSTRAP_TEST_ACCOUNT_EMAIL,
    ownerUid: testUser.uid,
    status: "active",
    subscriptionExpiresAt: Timestamp.fromDate(expiresAt),
    createdAt: Timestamp.now(),
  });
  console.log(`Conta de teste criada: ${BOOTSTRAP_TEST_ACCOUNT_EMAIL} (accountId ${accountId})`);
} else {
  console.log("BOOTSTRAP_TEST_ACCOUNT_EMAIL/PASSWORD não definidos — pulando criação de conta de teste.");
}

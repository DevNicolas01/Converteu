import { onCall, HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { auth, db } from "./lib/firebaseAdmin";

interface Payload {
  companyName: string;
  email: string;
  password: string;
  subscriptionMonths?: number;
}

/** Cria uma conta de cliente nova (uid = accountId). Só admin pode chamar. */
export const adminCreateAccount = onCall<Payload>(async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Apenas admins podem criar contas");
  }

  const { companyName, email, password, subscriptionMonths = 1 } = request.data ?? ({} as Payload);
  if (!companyName || !email || !password) {
    throw new HttpsError("invalid-argument", "companyName, email e password são obrigatórios");
  }

  let uid: string | undefined;
  try {
    const user = await auth.createUser({ email, password, emailVerified: true });
    uid = user.uid;
    const accountId = uid;

    await auth.setCustomUserClaims(uid, { accountId });

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + subscriptionMonths);

    await db.doc(`accounts/${accountId}`).set({
      companyName,
      email,
      ownerUid: uid,
      status: "active",
      subscriptionExpiresAt: Timestamp.fromDate(expiresAt),
      createdAt: Timestamp.now(),
    });

    return { accountId, uid };
  } catch (err) {
    if (uid) {
      await auth.deleteUser(uid).catch(() => {});
    }
    throw err;
  }
});

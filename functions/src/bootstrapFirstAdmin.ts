import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { auth, db } from "./lib/firebaseAdmin";

const bootstrapSecret = defineSecret("BOOTSTRAP_SECRET");

/** Cria o primeiro admin do sistema. Só funciona uma vez (guard em _meta/bootstrap.used). */
export const bootstrapFirstAdmin = onRequest({ secrets: [bootstrapSecret] }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const bootstrapRef = db.doc("_meta/bootstrap");
  const bootstrapSnap = await bootstrapRef.get();
  if (bootstrapSnap.exists && bootstrapSnap.data()?.used) {
    res.status(403).json({ error: "Bootstrap já foi usado" });
    return;
  }

  const { email, password, secret } = req.body ?? {};
  if (secret !== bootstrapSecret.value()) {
    res.status(403).json({ error: "Secret inválido" });
    return;
  }
  if (!email || !password) {
    res.status(400).json({ error: "email e password são obrigatórios" });
    return;
  }

  const user = await auth.createUser({ email, password, emailVerified: true });
  await auth.setCustomUserClaims(user.uid, { admin: true });
  await db.doc(`admins/${user.uid}`).set({ role: "admin" });
  await bootstrapRef.set({ used: true }, { merge: true });

  res.status(200).json({ uid: user.uid, email });
});

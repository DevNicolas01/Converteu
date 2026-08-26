import crypto from "node:crypto";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./lib/firebaseAdmin";

const googleClientId = defineSecret("GOOGLE_CLIENT_ID");
const googleClientSecret = defineSecret("GOOGLE_CLIENT_SECRET");
const googleRedirectUrl = defineSecret("GOOGLE_OAUTH_REDIRECT_URL");
const oauthStateSecret = defineSecret("OAUTH_STATE_SECRET");

function signState(accountId: string, secret: string) {
  const hmac = crypto.createHmac("sha256", secret).update(accountId).digest("hex");
  return `${accountId}.${hmac}`;
}

function verifyState(state: string, secret: string): string | null {
  const [accountId, hmac] = state.split(".");
  if (!accountId || !hmac) return null;
  const expected = crypto.createHmac("sha256", secret).update(accountId).digest("hex");
  return hmac === expected ? accountId : null;
}

/** Monta a URL de consentimento do Google e redireciona o navegador. Chamado com ?accountId=... */
export const googleOAuthStart = onRequest(
  { secrets: [googleClientId, googleRedirectUrl, oauthStateSecret] },
  async (req, res) => {
    const accountId = String(req.query.accountId || "");
    if (!accountId) {
      res.status(400).send("accountId é obrigatório");
      return;
    }

    const state = signState(accountId, oauthStateSecret.value());
    const params = new URLSearchParams({
      client_id: googleClientId.value(),
      redirect_uri: googleRedirectUrl.value(),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: "https://www.googleapis.com/auth/calendar.events",
      state,
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }
);

/** Recebe o callback do Google, troca o code por tokens e salva em googleTokens/{accountId}. */
export const googleOAuthCallback = onRequest(
  { secrets: [googleClientId, googleClientSecret, googleRedirectUrl, oauthStateSecret] },
  async (req, res) => {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    const accountId = verifyState(state, oauthStateSecret.value());

    if (!accountId || !code) {
      res.status(400).send("Requisição inválida");
      return;
    }

    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleClientId.value(),
        client_secret: googleClientSecret.value(),
        redirect_uri: googleRedirectUrl.value(),
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResp.ok) {
      res.status(500).send("Falha ao trocar o código por token");
      return;
    }
    const tokenData: any = await tokenResp.json();

    const tokenDoc: Record<string, unknown> = {
      accessToken: tokenData.access_token,
      scope: tokenData.scope,
      expiresAt: Timestamp.fromMillis(Date.now() + tokenData.expires_in * 1000),
    };
    // O Google só devolve refresh_token no primeiro consentimento — não sobrescrever se ausente.
    if (tokenData.refresh_token) tokenDoc.refreshToken = tokenData.refresh_token;

    await db.doc(`googleTokens/${accountId}`).set(tokenDoc, { merge: true });

    res.status(200).send("Google Calendar conectado! Você já pode fechar esta aba.");
  }
);

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { auth, db } from "./lib/firebaseAdmin";

const resendApiKey = defineSecret("RESEND_API_KEY");
const emailFrom = defineSecret("EMAIL_FROM");

type EmailType = "reset" | "invite";

interface Payload {
  email: string;
  /** "reset" = esqueci minha senha (link de login). "invite" = primeiro acesso de uma conta
   * criada pelo admin (nova senha antes de nunca ter logado). */
  type: EmailType;
}

function buildHtml(link: string, type: EmailType) {
  const titulo = type === "invite" ? "Defina sua senha" : "Redefinir sua senha";
  const corpo =
    type === "invite"
      ? "Sua conta no Arrow Shot foi criada. Clique no botão abaixo pra definir sua senha e começar a usar."
      : "Recebemos um pedido pra redefinir a senha da sua conta no Arrow Shot. Se foi você, clique no botão abaixo.";
  const botao = type === "invite" ? "Definir senha" : "Redefinir senha";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fa;font-family:-apple-system,Segoe UI,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
      <p style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#f59e0b;margin:0 0 8px;">Arrow Shot</p>
      <h1 style="font-size:20px;color:#141d3a;margin:0 0 12px;">${titulo}</h1>
      <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 24px;">${corpo}</p>
      <a href="${link}" style="display:inline-block;background:#f59e0b;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">${botao}</a>
      <p style="font-size:12px;color:#888;margin:28px 0 0;line-height:1.5;">
        Se você não pediu isso, pode ignorar este e-mail com tranquilidade -- sua senha continua a mesma.
      </p>
    </div>
  </body>
</html>`;
}

/**
 * Manda o e-mail de "definir senha" (conta nova criada pelo admin) ou "redefinir senha" (esqueci
 * minha senha) via Resend, no lugar do e-mail padrão do Firebase -- que ainda vem com o nome
 * antigo do projeto ("Converteu") e, por sair de um domínio genérico do Firebase sem SPF/DKIM
 * configurado por nós, cai fácil em spam. O link em si (oobCode) continua sendo gerado pelo
 * próprio Firebase Auth -- só troca quem manda e como o e-mail é montado.
 */
export const sendAuthEmail = onCall<Payload>({ secrets: [resendApiKey, emailFrom] }, async (request) => {
  const { email, type } = request.data ?? ({} as Payload);
  if (!email || (type !== "reset" && type !== "invite")) {
    throw new HttpsError("invalid-argument", "E-mail e tipo ('reset' ou 'invite') são obrigatórios.");
  }
  // "invite" é disparado pelo admin ao criar uma conta/adicionar um admin -- "reset" é público
  // (tela de login, ninguém precisa estar autenticado pra pedir redefinição da própria senha).
  // Admin conta de duas formas, igual às regras do Firestore (isAdmin() em firestore.rules): a
  // claim custom (primeiro admin, via bootstrapFirstAdmin) OU um doc em admins/{uid} (quem foi
  // adicionado depois por outro admin, via adminAddAdmin) -- só checar a claim deixaria de fora
  // qualquer admin adicionado desse segundo jeito.
  if (type === "invite") {
    const isClaimAdmin = request.auth?.token?.admin === true;
    const uid = request.auth?.uid;
    const isDocAdmin = !isClaimAdmin && !!uid && (await db.doc(`admins/${uid}`).get()).exists;
    if (!isClaimAdmin && !isDocAdmin) {
      throw new HttpsError("permission-denied", "Apenas admins podem convidar.");
    }
  }

  let link: string;
  try {
    link = await auth.generatePasswordResetLink(email);
  } catch (err) {
    // Não revela se o e-mail existe ou não na base -- evita que alguém use isso pra descobrir
    // quais e-mails têm conta (enumeração de contas). Finge sucesso do mesmo jeito.
    console.error("Falha ao gerar link de redefinição", err);
    return { success: true };
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey.value()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: emailFrom.value(),
      to: [email],
      subject: type === "invite" ? "Defina sua senha — Arrow Shot" : "Redefinir sua senha — Arrow Shot",
      html: buildHtml(link, type),
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Erro do Resend ao enviar e-mail de auth", errText);
    throw new HttpsError("internal", "Não foi possível enviar o e-mail agora.");
  }

  return { success: true };
});

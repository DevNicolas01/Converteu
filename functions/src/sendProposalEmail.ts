import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./lib/firebaseAdmin";

const resendApiKey = defineSecret("RESEND_API_KEY");
const emailFrom = defineSecret("EMAIL_FROM");

interface Payload {
  accountId: string;
  proposalId: string;
  destinatario: string;
  assunto?: string;
  mensagem?: string;
  pdfBase64: string;
  pdfFileName?: string;
}

/** Envia o PDF de uma proposta por e-mail via Resend, e registra o resultado em emailLogs. */
export const sendProposalEmail = onCall<Payload>({ secrets: [resendApiKey, emailFrom] }, async (request) => {
  const { accountId, proposalId, destinatario, assunto, mensagem, pdfBase64, pdfFileName } =
    request.data ?? ({} as Payload);

  const token = request.auth?.token;
  if (!token || (token.accountId !== accountId && token.admin !== true)) {
    throw new HttpsError("permission-denied", "Não autorizado a enviar por essa conta");
  }
  if (!accountId || !proposalId || !destinatario || !pdfBase64) {
    throw new HttpsError("invalid-argument", "Campos obrigatórios ausentes");
  }

  const logRef = db.collection(`accounts/${accountId}/emailLogs`).doc();

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey.value()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom.value(),
        to: [destinatario],
        subject: assunto || "Sua proposta",
        html: mensagem || "Segue a proposta em anexo.",
        attachments: [{ filename: pdfFileName || "proposta.pdf", content: pdfBase64 }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      await logRef.set({ proposalId, destinatario, status: "failed", erro: errText, enviadoEm: Timestamp.now() });
      throw new HttpsError("internal", `Erro do Resend: ${errText}`);
    }

    await logRef.set({ proposalId, destinatario, status: "sent", erro: null, enviadoEm: Timestamp.now() });
    return { success: true };
  } catch (err: any) {
    await logRef.set({
      proposalId,
      destinatario,
      status: "failed",
      erro: String(err?.message ?? err),
      enviadoEm: Timestamp.now(),
    });
    throw err;
  }
});

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./lib/firebaseAdmin";

const googleClientId = defineSecret("GOOGLE_CLIENT_ID");
const googleClientSecret = defineSecret("GOOGLE_CLIENT_SECRET");

interface Payload {
  accountId: string;
  proposalId: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  attendeeEmail?: string;
}

async function getValidAccessToken(accountId: string): Promise<string> {
  const ref = db.doc(`googleTokens/${accountId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "Conecte o Google Calendar primeiro");
  }
  const data = snap.data()!;
  const expiresAt = (data.expiresAt as Timestamp).toMillis();

  if (Date.now() < expiresAt - 60_000) {
    return data.accessToken;
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: data.refreshToken,
      client_id: googleClientId.value(),
      client_secret: googleClientSecret.value(),
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    throw new HttpsError("internal", "Falha ao renovar token do Google");
  }
  const refreshed: any = await resp.json();
  const newExpiresAt = Timestamp.fromMillis(Date.now() + refreshed.expires_in * 1000);
  await ref.set({ accessToken: refreshed.access_token, expiresAt: newExpiresAt }, { merge: true });
  return refreshed.access_token;
}

/** Cria um evento no Google Calendar do usuário, vinculado a uma proposta existente. */
export const createCalendarEvent = onCall<Payload>(
  { secrets: [googleClientId, googleClientSecret] },
  async (request) => {
    const { accountId, proposalId, title, description, startDateTime, endDateTime, attendeeEmail } =
      request.data ?? ({} as Payload);

    const token = request.auth?.token;
    if (!token || (token.accountId !== accountId && token.admin !== true)) {
      throw new HttpsError("permission-denied", "Não autorizado");
    }
    if (!accountId || !proposalId || !title || !startDateTime || !endDateTime) {
      throw new HttpsError("invalid-argument", "Campos obrigatórios ausentes");
    }

    const proposalSnap = await db.doc(`accounts/${accountId}/proposals/${proposalId}`).get();
    if (!proposalSnap.exists) {
      throw new HttpsError("not-found", "Proposta não encontrada");
    }

    const accessToken = await getValidAccessToken(accountId);

    const event: Record<string, unknown> = {
      summary: title,
      description: description || "",
      start: { dateTime: startDateTime },
      end: { dateTime: endDateTime },
    };
    if (attendeeEmail) event.attendees = [{ email: attendeeEmail }];

    const resp = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new HttpsError("internal", `Erro do Google Calendar: ${errText}`);
    }

    return await resp.json();
  }
);

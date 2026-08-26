import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "./lib/firebaseAdmin";

/** Retorna métricas agregadas de todos os clientes. Só admin pode chamar. */
export const adminDashboardStats = onCall(async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Apenas admins");
  }

  const accountsSnap = await db.collection("accounts").get();

  const stats = await Promise.all(
    accountsSnap.docs.map(async (accDoc) => {
      const account = accDoc.data();
      const proposalsSnap = await db.collection(`accounts/${accDoc.id}/proposals`).get();

      let totalPropostas = 0;
      let propostasFechadas = 0;
      let valorTotalOrcado = 0;
      let valorTotalFechado = 0;

      proposalsSnap.forEach((doc) => {
        const p = doc.data();
        totalPropostas += 1;
        valorTotalOrcado += Number(p.valor) || 0;
        if (p.status === "fechado") {
          propostasFechadas += 1;
          valorTotalFechado += Number(p.valor) || 0;
        }
      });

      return {
        accountId: accDoc.id,
        companyName: account.companyName,
        email: account.email,
        status: account.status,
        subscriptionExpiresAt: account.subscriptionExpiresAt?.toDate?.()?.toISOString() ?? null,
        totalPropostas,
        propostasFechadas,
        taxaConversao: totalPropostas > 0 ? propostasFechadas / totalPropostas : 0,
        valorTotalOrcado,
        valorTotalFechado,
      };
    })
  );

  stats.sort((a, b) => String(a.companyName).localeCompare(String(b.companyName)));
  return stats;
});

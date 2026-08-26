// Suíte de teste das regras do Firestore/Storage, rodando contra o emulador local.
// NOTA: o prompt original menciona um arquivo já pronto com ~19 cenários testados
// ("firestore-rules.test.mjs anexo") que não chegou a ser colado nesta conversa.
// Esta é uma primeira versão própria cobrindo os cenários descritos no prompt —
// troque pelo arquivo original se ele existir, ou complemente os cenários que faltarem.
//
// Rodar com:
//   npx firebase emulators:exec --project=converteu-dec78 "node firestore-rules.test.mjs"

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { Timestamp } from "firebase/firestore";

let testEnv;

async function setup() {
  testEnv = await initializeTestEnvironment({
    projectId: "converteu-rules-test",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
}

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const future = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    const past = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

    await db.doc("accounts/accA").set({
      companyName: "Conta A", email: "a@a.com", ownerUid: "userA",
      status: "active", subscriptionExpiresAt: future, createdAt: Timestamp.now(),
    });
    await db.doc("accounts/accExpired").set({
      companyName: "Conta Vencida", email: "b@b.com", ownerUid: "userExpired",
      status: "active", subscriptionExpiresAt: past, createdAt: Timestamp.now(),
    });
    await db.doc("accounts/accB").set({
      companyName: "Conta B", email: "c@c.com", ownerUid: "userB",
      status: "active", subscriptionExpiresAt: future, createdAt: Timestamp.now(),
    });
    await db.doc("accounts/accA/proposals/p1").set({
      clienteNome: "Cliente 1", status: "em_andamento", valor: 1000,
    });
  });
}

test("isolamento entre contas", async (t) => {
  await setup();
  await seed();

  await t.test("cliente A não lê conta B", async () => {
    const ctx = testEnv.authenticatedContext("userA", { accountId: "accA" });
    await assertFails(ctx.firestore().doc("accounts/accB").get());
  });

  await t.test("cliente A não lê propostas de outra conta", async () => {
    const ctx = testEnv.authenticatedContext("userA", { accountId: "accA" });
    await assertFails(ctx.firestore().collection("accounts/accB/proposals").get());
  });

  await t.test("cliente A lê os próprios dados", async () => {
    const ctx = testEnv.authenticatedContext("userA", { accountId: "accA" });
    await assertSucceeds(ctx.firestore().doc("accounts/accA").get());
  });

  await testEnv.cleanup();
});

test("bloqueio de campos sensíveis pelo cliente comum", async (t) => {
  await setup();
  await seed();

  await t.test("cliente não pode alterar subscriptionExpiresAt", async () => {
    const ctx = testEnv.authenticatedContext("userA", { accountId: "accA" });
    await assertFails(
      ctx.firestore().doc("accounts/accA").update({
        subscriptionExpiresAt: Timestamp.now(),
      })
    );
  });

  await t.test("cliente não pode alterar status", async () => {
    const ctx = testEnv.authenticatedContext("userA", { accountId: "accA" });
    await assertFails(ctx.firestore().doc("accounts/accA").update({ status: "suspended" }));
  });

  await t.test("cliente pode alterar campos não sensíveis (via companyProfile)", async () => {
    const ctx = testEnv.authenticatedContext("userA", { accountId: "accA" });
    await assertSucceeds(
      ctx.firestore().doc("accounts/accA/companyProfile/profile").set({ companyName: "Novo nome" })
    );
  });

  await testEnv.cleanup();
});

test("assinatura vencida bloqueia nova proposta", async (t) => {
  await setup();
  await seed();

  await t.test("cliente com assinatura vencida não cria proposta", async () => {
    const ctx = testEnv.authenticatedContext("userExpired", { accountId: "accExpired" });
    await assertFails(
      ctx.firestore().collection("accounts/accExpired/proposals").add({ clienteNome: "X", status: "em_andamento", valor: 100 })
    );
  });

  await t.test("cliente com assinatura ativa cria proposta normalmente", async () => {
    const ctx = testEnv.authenticatedContext("userA", { accountId: "accA" });
    await assertSucceeds(
      ctx.firestore().collection("accounts/accA/proposals").add({ clienteNome: "X", status: "em_andamento", valor: 100 })
    );
  });

  await testEnv.cleanup();
});

test("admin tem acesso total", async (t) => {
  await setup();
  await seed();

  await t.test("admin lê qualquer conta", async () => {
    const ctx = testEnv.authenticatedContext("adminUser", { admin: true });
    await assertSucceeds(ctx.firestore().doc("accounts/accB").get());
  });

  await t.test("admin altera subscriptionExpiresAt de qualquer conta", async () => {
    const ctx = testEnv.authenticatedContext("adminUser", { admin: true });
    await assertSucceeds(
      ctx.firestore().doc("accounts/accA").update({ subscriptionExpiresAt: Timestamp.now() })
    );
  });

  await t.test("cliente comum não vira admin sozinho", async () => {
    const ctx = testEnv.authenticatedContext("userA", { accountId: "accA" });
    await assertFails(ctx.firestore().doc("admins/userA").set({ role: "admin" }));
  });

  await testEnv.cleanup();
});

test("usuário não autenticado não acessa nada", async (t) => {
  await setup();
  await seed();

  await t.test("bloqueia leitura sem login", async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(ctx.firestore().doc("accounts/accA").get());
  });

  await testEnv.cleanup();
  assert.ok(true);
});

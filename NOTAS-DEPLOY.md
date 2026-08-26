# Notas de deploy — Converteu no Firebase

## Pré-requisitos únicos (feitos manualmente, não automatizáveis)

- Projeto Firebase criado (`converteu-dec78` ou o ID real que ficar definido).
- Upgrade pro plano Blaze (obrigatório só para publicar Cloud Functions).
- Um app Web registrado no console (Project settings > General > Your apps) —
  gera o objeto `firebaseConfig` usado em `firebase-config.js`.
- Client OAuth do Google Cloud (mesmo projeto): APIs & Services > Credentials >
  OAuth client ID > Web application. O redirect URI é a URL pública da function
  `googleOAuthCallback` depois do primeiro deploy (`firebase deploy --only
  functions:googleOAuthCallback` e copiar a URL do output).
- Conta no Resend (ou outro provedor transacional) com domínio de envio
  verificado, para gerar `RESEND_API_KEY` e definir `EMAIL_FROM`.

## Arquivos locais que não vão pro git (`.gitignore`)

- `service-account.json` — baixado em Project Settings > Service accounts >
  Generate new private key. Usado só pelo `scripts/bootstrap-local.mjs`.
- `firebase-config.js` — copiar de `firebase-config.example.js` e preencher com
  os valores reais do app Web.

## Secrets das Cloud Functions

Cada um definido com `firebase functions:secrets:set NOME_DO_SECRET`:

| Secret | Usado em | Observação |
|---|---|---|
| `BOOTSTRAP_SECRET` | `bootstrapFirstAdmin` | string aleatória longa, só você guarda |
| `RESEND_API_KEY` | `sendProposalEmail` | da conta Resend |
| `EMAIL_FROM` | `sendProposalEmail` | precisa ser de um domínio verificado no Resend |
| `GOOGLE_CLIENT_ID` | `googleOAuth*`, `createCalendarEvent` | do OAuth client no Google Cloud |
| `GOOGLE_CLIENT_SECRET` | idem | idem |
| `GOOGLE_OAUTH_REDIRECT_URL` | `googleOAuth*` | URL pública de `googleOAuthCallback` após deploy |
| `OAUTH_STATE_SECRET` | `googleOAuth*` | string aleatória longa qualquer, só pra assinar o `state` |

## Ordem de deploy

1. `firebase login` (uma vez, na conta dona do projeto).
2. `firebase use converteu-dec78` (ou o ID real).
3. `npx firebase emulators:exec --project=converteu-dec78 "node firestore-rules.test.mjs"`
   — não seguir adiante enquanto não passar tudo.
4. Enquanto o Blaze não estiver ativo: `node scripts/bootstrap-local.mjs` (ver
   cabeçalho do script) para ter um admin + conta de teste e já poder testar
   `firebase-client.js` contra o emulador (`firebase emulators:start`).
5. Com o Blaze ativo: setar os secrets acima e rodar `firebase deploy --only
   functions` (dentro de `functions/`, `npm install` primeiro).
6. Rodar `bootstrapFirstAdmin` de verdade em produção via `curl`:
   ```bash
   curl -X POST https://<region>-<project>.cloudfunctions.net/bootstrapFirstAdmin \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@empresa.com","password":"...","secret":"<BOOTSTRAP_SECRET>"}'
   ```
7. `firebase deploy --only firestore:rules,storage` para publicar as regras.
8. Copiar `firebase-config.example.js` para `firebase-config.js` com os valores
   reais e testar o app inteiro em produção.

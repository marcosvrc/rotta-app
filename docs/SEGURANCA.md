# Segurança do Rotta

## O que é segredo e o que não é

| Item | Segredo? | Onde fica |
| --- | --- | --- |
| Configuração do Firebase (`apiKey`, `projectId`, `appId`...) | **Não.** Vai dentro do APK e qualquer um consegue ler. Só identifica o projeto. | `.env` (fora do git) e *Secrets* do GitHub, por organização |
| Senhas dos usuários | Sim | Só no Firebase Auth. Nunca no app nem no banco |
| Chave do OpenRouter | **Sim.** Quem tiver gasta seu crédito | Só no Secret Manager (`functions:secrets:set`), lida pela Cloud Function. Nunca no app nem no GitHub |

A proteção dos dados vem das **regras do Firestore** (`firestore.rules`), testadas em `firestore-tests/rules.test.js`:

- só quem está logado acessa, e cada usuário só a própria pasta `users/{uid}/trips`;
- só os campos esperados, com tipos certos e menos de 900 KB por viagem;
- `savedAt` precisa ser a hora do servidor;
- nada pode ser apagado pelo app (exclusão é só marcação);
- qualquer outro caminho do banco é negado, inclusive o cache e o consumo da IA (`ai_cache`, `ai_usage`), que só a Cloud Function acessa.

A função de IA (`functions/`) só atende usuário logado, valida cada pedido, tem limite diário por usuário (`AI_DAILY_LIMIT`), no máximo 5 instâncias simultâneas e registra tokens e custo de cada chamada. O App Check será ligado nela na etapa 5.

Rodar os testes: `npm run test:rules` (precisa de Java 11+). No GitHub, o workflow **Regras do Firestore** roda sozinho a cada mudança nas regras.

## Passo a passo no console (fazer ao criar o projeto)

### 1. Restringir a chave a só três APIs

1. Abra https://console.cloud.google.com/apis/credentials e escolha o projeto do Rotta.
2. Abra a chave **Browser key (auto created by Firebase)**, que é a usada pelo app.
3. Em **Restrições de API**, marque **Restringir chave** e escolha só:
   - Identity Toolkit API
   - Token Service API
   - Cloud Firestore API
4. Em **Restrições de aplicativo**, deixe **Nenhuma**.
5. Salve. Pode levar alguns minutos para valer.

> Por que não restringir por app Android? O app usa o SDK JavaScript do Firebase, que não envia o pacote e o certificado do Android. Com essa restrição, o login para de funcionar. A proteção equivalente é o App Check (item 4).

### 2. Proteção contra descoberta de e-mails

Firebase Console > **Authentication** > **Configurações** > **Ações do usuário**: ative **Proteção contra enumeração de e-mails**. Assim ninguém descobre quais e-mails têm conta.

### 3. Publicar as regras

```
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project <id-do-projeto>
```

Confira em Firestore > **Regras** que o texto é o mesmo de `firestore.rules`.

### 4. App Check (antes de publicar na loja)

O App Check faz o Firebase aceitar chamadas só do app original instalado da Play Store, e não de scripts com a chave copiada. No Android ele usa o Play Integrity, que exige o SDK nativo (React Native Firebase) e um build de desenvolvimento pelo EAS. Entra na etapa 5, junto com a assinatura do app para a loja.

### 5. Alertas de gasto (quando ativar o plano Blaze)

Google Cloud > **Faturamento** > **Orçamentos e alertas**: crie um orçamento baixo (ex.: R$ 50/mês) com alertas em 50%, 90% e 100%. No OpenRouter, defina também um limite de crédito na chave.

## Dados no aparelho

Viagens, gastos, reservas e contatos do SOS ficam no armazenamento interno do app. Outros apps não conseguem ler, mas um celular com root consegue. Anexos (ingressos, QR codes) nunca sobem para a nuvem.

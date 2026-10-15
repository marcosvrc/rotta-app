# IA no Rotta

## Como funciona

```
App ──(login do Firebase)──> Cloud Function "ia" (São Paulo) ──> OpenRouter ──> modelo
                                   │
                                   ├── Wikipedia e Wikivoyage (fontes)
                                   └── Firestore: cache e limite diário (só o servidor acessa)
```

- O app nunca vê a chave do OpenRouter. Ele chama a função `ia` com o login do usuário.
- A função valida o pedido, confere o limite diário do usuário, busca as fontes, chama o modelo e confere o JSON da resposta. Se vier fora do formato, pede uma correção uma vez.
- O validador de roteiro continua decidindo em código: a IA só explica alertas e sugere paradas, que passam pelo validador depois de adicionadas.
- Textos da Wikipedia e do Wikivoyage vão ao modelo como dados, entre marcações, com instrução para ignorar qualquer ordem escrita neles.

| Tarefa | Modelo | Fonte | Cache |
| --- | --- | --- | --- |
| Explicar alerta do validador | rápido | o próprio alerta | não |
| Guia do destino | rápido | Wikivoyage (pt, depois en) | 30 dias por destino |
| História do lugar | rápido | Wikipedia (pt, depois en); sem artigo, não gera | 90 dias por lugar |
| Sugerir paradas do dia | forte | Wikivoyage | não |

Respostas que vêm do cache não contam no limite diário.

## Ligar (precisa do plano Blaze no Firebase)

1. No OpenRouter (https://openrouter.ai), crie uma chave e defina um **limite de crédito** para ela.
2. No Firebase, mude o projeto para o plano **Blaze** e crie um alerta de orçamento (veja `SEGURANCA.md`).
3. Instale as dependências das functions:
   ```
   cd functions
   npm ci
   ```
4. Guarde a chave no Secret Manager (ela não fica em nenhum arquivo):
   ```
   npx firebase-tools functions:secrets:set OPENROUTER_API_KEY --project <id-do-projeto>
   ```
5. Publique a função e as regras:
   ```
   npx firebase-tools deploy --only functions,firestore:rules --project <id-do-projeto>
   ```

## Ajustes sem nova versão do app

Crie `functions/.env.<id-do-projeto>` (não vai para o git) e publique de novo:

```
AI_MODEL_FAST=anthropic/claude-haiku-5.5
AI_MODEL_STRONG=anthropic/claude-sonnet-5.5
AI_DAILY_LIMIT=30
AI_REASONING_FAST=off
AI_REASONING_STRONG=low
```

`AI_REASONING_*` controla o raciocínio interno de cada modelo (`off`, `low`, `medium`, `high`). Os tokens de raciocínio contam no limite da resposta: com esforço alto, a resposta pode vir vazia. O Claude Sonnet 5.5 não aceita `off`; use `low`.

O consumo por usuário e por dia fica em `ai_usage/{uid}/days/{data}` (chamadas, tokens e custo), e cada chamada aparece no log da função com tarefa, tokens, custo e tempo.

## Testes

- `cd functions && npm test`: orquestrador, OpenRouter e fontes com respostas falsas.
- `cd functions && npm run serve`: sobe a função no emulador. Com `OPENROUTER_BASE_URL` no `.env.local`, dá para apontar para um servidor falso.

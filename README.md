# Rotta

App para organização de viagens: roteiros por dia, lugares com história, verificação automática do roteiro e simulador de custos. Feito em React Native com Expo e TypeScript, para Android e iOS.

## Rodar no Mac

Requer Node.js 20 ou mais novo.

```bash
npm install
npx expo start
```

Com o servidor rodando:

- **No celular:** instale o app **Expo Go** (Play Store ou App Store), conecte o celular na mesma rede Wi-Fi do Mac e leia o QR code que aparece no Terminal.
- **No emulador Android:** com um emulador aberto pelo Android Studio, aperte `a` no Terminal.
- **No simulador do iPhone:** com o Xcode instalado, aperte `i`.
- **No navegador:** aperte `w`.

As mudanças no código aparecem na hora, sem precisar compilar de novo.

## Instalar a versão de teste no Android

A cada envio para a `master`, o GitHub Actions confere os tipos, roda os testes e gera um APK.

1. No celular, abra a página de [releases](../../releases) e entre em **Última build de teste**.
2. Baixe `rotta.apk` e abra o arquivo.
3. Se o Android pedir, permita instalar apps desta origem.

## Comandos

```bash
npm test            # testes da lógica
npm run typecheck   # checagem de tipos
```

## Estrutura

| Pasta | O que tem |
| --- | --- |
| `src/app/` | Telas e navegação (Expo Router). Cada arquivo é uma tela. |
| `src/core/` | Lógica sem interface: modelos, validador de roteiro, simulador de custos e a viagem de exemplo. Pode ser reaproveitada no backend. |
| `src/components/` | Componentes visuais compartilhados. |
| `src/state/` | Estado do app, salvo no aparelho, e anexos. |
| `.github/workflows/` | CI que testa e gera o APK, e testa as regras do Firestore. |
| `functions/` | Cloud Function `ia`: orquestrador de IA com OpenRouter. |
| `firestore.rules` e `firestore-tests/` | Regras de acesso ao banco e seus testes. |

## O que já funciona

- Viagem de exemplo a Lisboa, com 5 dias e 16 paradas.
- Criar, editar e apagar viagens; adicionar, mover e remover paradas, inclusive lugares criados por você.
- Roteiro por dia com tempo e distância entre as paradas.
- Detalhe do lugar com história, informações e dicas.
- Verificação do roteiro: lugar fechado no dia, horário de abertura, deslocamento que não cabe, chuva em parada ao ar livre e dia pesado demais para o ritmo escolhido. Cada alerta traz um plano B que pode ser aplicado.
- Simulador de custos por viajantes, hospedagem e alimentação, comparando com o orçamento.
- Registro de gastos com gráficos por dia (comparando com o previsto), por categoria e por forma de pagamento.
- Reservas com código e anexo de ingresso, QR code ou PDF, que abrem sem internet.
- Checklist pré-viagem com prazos contados a partir da data de ida.
- Previsão do tempo real (Open-Meteo) nos dias que estão a até 16 dias; os dias chuvosos alimentam o validador. Antes disso, dá para marcar a chuva à mão.
- Lista de mala sugerida pelos dias, clima, praia no roteiro e destino, com itens próprios.
- SOS com números de emergência do país e contatos da viagem (hospedagem, seguro, consulado), com toque para ligar.
- Backup em arquivo para trocar de celular (os anexos não entram no backup).
- Conta com e-mail e senha (Firebase) e sincronização das viagens entre aparelhos. Sem o Firebase configurado, o app funciona só no aparelho.
- Gastos em moeda local (cotação do dia pelo Frankfurter, guardada para uso offline, ou digitada à mão) e divisão de despesas com acerto de contas.
- Lembretes no celular, sem internet: prazos do checklist, véspera e 2 horas antes das reservas e começo de cada dia, no fuso do destino.
- Fotos dos lugares do Wikimedia Commons (gratuitas, com autor e licença).
- Compartilhar o roteiro em texto (WhatsApp) ou PDF; reordenar paradas e trocar o programa de dois dias.
- Excluir conta e dados (exigido pelas lojas e pela LGPD), pela Cloud Function `excluirConta`.
- IA (OpenRouter, via Cloud Function): explica alertas do validador, gera o guia do destino e a história dos lugares a partir da Wikipedia e do Wikivoyage, e sugere paradas para um dia. Veja [docs/IA.md](docs/IA.md).
- Troca da cor de destaque do app.

Tudo fica salvo no aparelho e funciona offline. Horários de funcionamento e preços ainda são de exemplo. Os próximos passos são as APIs do Google Maps, o backend (Firebase) com login e a IA.

## Publicar

Veja [docs/PUBLICACAO.md](docs/PUBLICACAO.md): páginas de privacidade e exclusão de conta (GitHub Pages), build assinado com EAS e Play Console.

## Ligar a nuvem (Firebase)

1. Crie um projeto em https://console.firebase.google.com (o plano gratuito Spark basta para login e banco).
2. Em **Authentication > Sign-in method**, ative **E-mail/senha**.
3. Em **Firestore Database**, crie o banco em modo de produção.
4. Publique as regras deste repositório: `npx firebase-tools login`, depois `npx firebase-tools deploy --only firestore:rules --project <id-do-projeto>`.
5. Em **Configurações do projeto > Seus apps**, adicione um app **Web** e copie a configuração.
6. Copie `.env.example` para `.env`, preencha e rode `npx expo start --clear`.
7. Para o APK do CI, cadastre os mesmos valores em **GitHub > Settings > Secrets and variables > Actions**, com os nomes do `.env.example`.

Antes de usar com dados reais, siga o passo a passo de [docs/SEGURANCA.md](docs/SEGURANCA.md): restringir a chave, proteger contra descoberta de e-mails e publicar as regras.

Para testar sem projeto real: `npx firebase-tools emulators:start --project demo-rotta` e, no `.env`, `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` com o IP do computador.

A primeira versão, em Kotlin Multiplatform, está guardada na branch `kotlin-multiplatform`.

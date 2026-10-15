# Publicar o Rotta na Play Store

Passo a passo para levar o app do APK de teste para a loja. O iOS vem depois, quando o Android estiver validado.

## 1. Páginas públicas (GitHub Pages)

A Play Store exige um link para a política de privacidade e outro para a exclusão de conta.

1. Em `docs/privacidade.html` e `docs/excluir-conta.html`, troque `[E-MAIL DE CONTATO]` por um e-mail que você leia.
2. No GitHub: **Settings > Pages > Build and deployment**: Source **Deploy from a branch**, branch **master**, pasta **/docs**. Salve.
3. Em alguns minutos as páginas ficam em:
   - https://marcosvrc.github.io/rotta-app/privacidade.html
   - https://marcosvrc.github.io/rotta-app/excluir-conta.html

## 2. Conta Expo e build assinado (EAS)

1. Crie uma conta grátis em https://expo.dev.
2. No Mac, dentro do projeto:
   ```
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```
   O `init` cria o projeto na Expo e grava o `projectId` no `app.json`. Faça commit dessa mudança.
3. Envie a configuração do Firebase (o seu `.env`) para os builds de teste e da loja:
   ```
   npx eas-cli@latest env:push --path .env --environment preview --environment production
   ```
   São valores públicos (vão dentro do app). Confira em https://expo.dev, no projeto, em **Environment variables**.
4. Build de teste (APK para instalar direto):
   ```
   npx eas-cli@latest build --platform android --profile preview
   ```
5. Build da loja (AAB, assinado pela Expo; a versão sobe sozinha a cada build):
   ```
   npx eas-cli@latest build --platform android --profile production
   ```

O plano grátis da Expo tem uma fila de builds com espera; serve bem para o começo.

## 3. Play Console

1. Crie a conta de desenvolvedor em https://play.google.com/console (taxa única de US$ 25). Conta pessoal pede verificação de identidade.
2. **Criar app**: nome `Rotta`, idioma padrão português (Brasil), app gratuito.
3. Preencha **Conteúdo do app** com as respostas da seção 4.
4. **Teste fechado**: contas pessoais novas precisam de um teste fechado com pelo menos **12 testadores por 14 dias seguidos** antes de liberar a produção (confira a regra atual na Play Console). Crie a faixa, envie o AAB e convide os testadores pelo e-mail.
5. Depois dos 14 dias, peça o acesso à produção e publique.

## 4. Respostas para a Play Console

**Política de privacidade:** https://marcosvrc.github.io/rotta-app/privacidade.html

**Anúncios:** não contém anúncios.

**Acesso ao app:** todas as funções principais funcionam sem login. Para a revisão testar a IA e a sincronização, crie uma conta de teste no app e informe o e-mail e a senha em "Acesso ao app".

**Segurança dos dados** (conferir com a política antes de enviar):

| Pergunta | Resposta |
| --- | --- |
| Coleta ou compartilha dados? | Sim |
| Dados criptografados em trânsito? | Sim (HTTPS) |
| O usuário pode pedir exclusão? | Sim, no app e por https://marcosvrc.github.io/rotta-app/excluir-conta.html |
| Informações pessoais: endereço de e-mail | Coletado; obrigatório só para quem cria conta; finalidade: gerenciamento da conta |
| Conteúdo gerado pelo usuário / outros conteúdos (viagens, gastos, reservas) | Coletado só com conta, para sincronizar; não compartilhado |
| Informações financeiras | Não (os gastos são anotações do usuário, sem dados de pagamento; marque como conteúdo do usuário) |
| Localização | Não coletada |
| Atividade no app / analytics | Não coletada |
| Compartilhamento com terceiros | Texto dos pedidos de IA enviado ao OpenRouter e ao provedor do modelo, só quando o usuário pede (processamento em nome do app) |

**Classificação de conteúdo:** questionário IARC; o app não tem violência, conteúdo sexual, jogos de azar nem interação entre usuários. Resultado esperado: Livre.

**Público-alvo:** maiores de 18 anos (ou 13+). Não marque crianças.

## 5. Texto da ficha da loja

**Nome:** Rotta: planejador de viagens

**Descrição curta (até 80 caracteres):**
Roteiro dia a dia conferido, gastos, reservas e guia do destino, até offline.

**Descrição completa:**

Planeje cada detalhe da viagem num lugar só.

ROTEIRO QUE SE CONFERE SOZINHO
Monte o roteiro dia a dia e o Rotta avisa quando um lugar está fechado, quando não dá tempo de chegar, quando chove numa parada ao ar livre ou quando o dia ficou pesado demais, sempre com um plano B pronto para aplicar.

PREVISÃO DO TEMPO DE VERDADE
Nos 16 dias antes da viagem, a previsão entra no roteiro e o app sugere trocar o passeio ao ar livre pelo museu.

GASTOS SEM SUSTO
Registre gastos em euro, dólar ou qualquer moeda com a cotação do dia, veja gráficos por dia, categoria e forma de pagamento e compare com o previsto. Divida as despesas com quem vai junto e veja quem deve para quem.

RESERVAS E INGRESSOS OFFLINE
Guarde voos, hotéis e ingressos com o QR code. Tudo abre sem internet, na hora do embarque.

INTELIGÊNCIA ARTIFICIAL QUE NÃO INVENTA
Gere o guia do destino (o que comer, beber, como circular), a história dos lugares a partir da Wikipedia e sugestões de paradas para o dia, sempre com a fonte e conferidas pelo validador do app.

E MAIS
Checklist pré-viagem com prazos, lista de mala sugerida pelo clima, SOS com números de emergência do país, lembretes no horário do destino, compartilhamento do roteiro em PDF ou WhatsApp e backup das viagens.

**Categoria:** Viagens e local.

**Imagens:** ícone 512x512 (gerar a partir de `assets/icon.png`), imagem de destaque 1024x500 e de 2 a 8 capturas de tela do celular.

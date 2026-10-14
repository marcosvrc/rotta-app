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
| `.github/workflows/` | CI que testa e gera o APK. |

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
- Troca da cor de destaque do app.

Tudo fica salvo no aparelho e funciona offline. Horários de funcionamento e preços ainda são de exemplo. Os próximos passos são as APIs do Google Maps, o backend (Firebase) com login e a IA.

A primeira versão, em Kotlin Multiplatform, está guardada na branch `kotlin-multiplatform`.

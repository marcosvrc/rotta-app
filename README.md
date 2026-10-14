# Rotta

App para organização de viagens: roteiros por dia, lugares com história, verificação automática do roteiro e simulador de custos.

## Instalar a versão de teste no Android

A cada envio para a `master`, o GitHub Actions roda os testes e gera um APK de teste.

1. No celular, abra a página de [releases](../../releases) e entre em **Última build de teste**.
2. Baixe `rotta-debug.apk` e abra o arquivo.
3. Se o Android pedir, permita instalar apps desta origem.

As builds de teste usam sempre a mesma chave, então uma versão nova instala por cima da anterior.

## Estrutura

| Pasta | O que tem |
| --- | --- |
| `shared/` | Lógica em Kotlin Multiplatform: modelos, validador de roteiro, simulador de custos e dados de exemplo. Será reaproveitada no iOS. |
| `androidApp/` | App Android em Jetpack Compose. |
| `.github/workflows/` | CI que testa e gera o APK. |

## O que já funciona

- Viagem de exemplo a Lisboa, com 5 dias e 16 paradas.
- Roteiro por dia com tempo e distância entre as paradas.
- Detalhe do lugar com história, informações e dicas.
- Verificação do roteiro: lugar fechado no dia, horário de abertura, deslocamento que não cabe, chuva em parada ao ar livre e dia pesado demais para o ritmo escolhido. Cada alerta traz um plano B que pode ser aplicado.
- Simulador de custos por viajantes, hospedagem e alimentação, comparando com o orçamento.
- Troca da cor de destaque do app.

Por enquanto os dados ficam só em memória, e horários e preços são de exemplo. Os próximos passos são o backend (Firebase), as APIs do Google Maps e a IA.

## Rodar localmente

Requer JDK 17 e Android SDK.

```bash
./gradlew :shared:testDebugUnitTest   # testes da lógica
./gradlew :androidApp:assembleDebug   # APK em androidApp/build/outputs/apk/debug/
```

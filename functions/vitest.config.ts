import { defineConfig } from 'vitest/config';

// Os testes importam ../../src/core/ai.ts; sem isto, o Vite procuraria o tsconfig do app (que estende o do Expo,
// não instalado aqui) e falharia no CI.
export default defineConfig({
  tsconfig: 'tsconfig.json',
});

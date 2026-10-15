/** Testes das regras do Firestore, separados dos testes da lógica do app (rodam no emulador). */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/firestore-tests/**/*.test.js'],
  transform: {},
  testTimeout: 20000,
};

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'functions/api/__tests__/**/*.test.js',
      'src/**/*.test.{js,jsx}'
    ],
  },
});

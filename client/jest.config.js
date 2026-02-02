/** @type {import('jest').Config} */
export default {
  // 使用 ts-jest 處理 TypeScript 檔案
  preset: 'ts-jest',

  // 使用 jsdom 環境模擬瀏覽器 API（WebSocket、window 等）
  testEnvironment: 'jsdom',

  // 測試檔案匹配模式
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],

  // 模組路徑對應，與 tsconfig 保持一致
  moduleNameMapper: {
    // 處理 CSS/樣式檔案（若有需要）
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // 設定檔案，在每個測試檔案執行前載入
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // ts-jest 轉換設定
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // 使用 ESM 模式
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },

  // 支援 ESM 模組
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // 忽略轉換的模組
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],

  // 覆蓋率收集設定
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
};

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 從根目錄載入 .env 檔案（monorepo 結構）
  const rootDir = path.resolve(__dirname, '..');
  const env = loadEnv(mode, rootDir, '');

  // 從環境變數讀取 port，若無則使用預設值
  const vitePort = parseInt(env.VITE_PORT) || 5173;
  const serverPort = parseInt(env.SERVER_PORT) || 3001;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: vitePort,
      // 代理 API 請求到後端，避免 CORS 問題
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
        },
        '/ws': {
          target: `ws://localhost:${serverPort}`,
          ws: true,
        },
      },
    },
  };
});

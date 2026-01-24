# Nginx 與 CORS 說明文檔

本文件說明此專案如何使用 nginx 作為反向代理，以及如何解決跨域 (CORS) 問題。

---

## 目錄

1. [什麼是 CORS](#什麼是-cors)
2. [為什麼需要 Nginx 反向代理](#為什麼需要-nginx-反向代理)
3. [架構圖解](#架構圖解)
4. [開發環境 vs 生產環境](#開發環境-vs-生產環境)

---

## 什麼是 CORS

**CORS (Cross-Origin Resource Sharing)** 是瀏覽器的安全機制，用來限制網頁向不同來源發送請求。

### 同源定義

**同源 (Same Origin) = 同協議 + 同網域 + 同 Port**

| 網頁來源 | 請求目標 | 結果 |
|---------|---------|------|
| `http://localhost:80` | `http://localhost:80/api` | ✅ 同源，允許 |
| `http://localhost:80` | `http://localhost:3001/api` | ❌ 跨域，阻擋 |
| `http://localhost:80` | `https://localhost:80/api` | ❌ 跨域（協議不同） |

### 跨域問題

當前端 (port 80) 直接請求後端 (port 3001) 時：

```
瀏覽器 (localhost:80) → 後端 API (localhost:3001)
                        ↑
                        不同 Port = 不同來源 = CORS 錯誤
```

---

## 為什麼需要 Nginx 反向代理

### 1. 解決跨域問題（主要原因）

透過 nginx 代理，所有請求都從同一個 port 發出：

```
瀏覽器 (localhost:80) → nginx (localhost:80) → 後端 (server:3001)
                        ↑
                        同源！瀏覽器不會阻擋
```

瀏覽器**完全不知道**後端 server:3001 的存在，它只看到：
- 網頁從 `localhost:80` 載入
- API 請求送到 `localhost:80/api/*`
- 回應也從 `localhost:80` 回來

### 2. 單一入口點

使用者只需要知道一個網址，nginx 根據路徑自動分流：

```
                    ┌─→ 靜態檔案 (/, /index.html, /assets/*)
用戶 → nginx:80 ────┼─→ API 請求 (/api/*) → 後端:3001
                    └─→ WebSocket (/ws/*) → 後端:3001
```

### 3. 生產環境優勢

| 項目 | 直接暴露後端 | 使用 nginx 代理 |
|------|-------------|----------------|
| 靜態檔案效能 | Node.js 處理（較慢） | nginx 處理（極快） |
| 安全性 | 後端直接暴露 | 後端隱藏在內網 |
| SSL/HTTPS | 需自行處理 | nginx 統一處理 |
| 負載均衡 | 無 | 可輕鬆擴展 |

---

## 架構圖解

### 請求流程

```
┌─────────────────────────────────────────────────────────────┐
│ 瀏覽器                                                       │
│                                                             │
│  前端 JS 發送請求                                            │
│  fetch('/api/containers')                                   │
│       │                                                     │
│       ▼                                                     │
│  瀏覽器檢查：請求目標是 localhost:80                          │
│              網頁來源是 localhost:80                          │
│              → 同源 ✓ 放行                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ nginx (localhost:80)                                        │
│                                                             │
│  收到 /api/containers                                        │
│  根據設定轉發到 http://server:3001/api/containers            │
│  （這段是 server-to-server，沒有 CORS 限制）                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 後端 (server:3001)                                          │
│                                                             │
│  處理請求，回傳 JSON                                         │
│  → 回應給 nginx → nginx 回應給瀏覽器                         │
└─────────────────────────────────────────────────────────────┘
```

## 開發環境 vs 生產環境

### 開發環境：Vite Proxy

開發時使用 Vite 內建的 proxy 功能，原理相同：

```typescript
// client/vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,  // 啟用 WebSocket 代理
      },
    },
  },
});
```

### 生產環境：Nginx

透過 Docker 部署時，nginx 取代 Vite 的角色：

```dockerfile
# client/Dockerfile
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```


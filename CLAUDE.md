# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

Container Log Viewer — 輕量級 Web UI 工具，用於即時查看 Docker/Podman 容器的 log。這是一個使用 npm workspaces 的 full-stack monorepo，前端為 React，後端為 Node.js。

## 常用指令

所有指令皆在專案根目錄執行：

```bash
npm install          # 安裝所有依賴（包含 client 與 server）
npm run dev          # 同時啟動前後端開發伺服器
npm run dev:client   # 僅啟動前端（Vite, port 5173）
npm run dev:server   # 僅啟動後端（tsx watch, port 3001）
npm run build        # 建構生產版本（tsc + vite build）
npm run start        # 啟動生產伺服器
```

## 架構概覽

```
Client (React) ←→ Vite Proxy ←→ Express Server ←→ Docker/Podman CLI
                                      ↓
                          WebSocket 即時串流 log
```

**資料流：**
1. 前端透過 HTTP 取得容器列表
2. 使用者選擇容器後，建立 WebSocket 連線
3. 後端透過 `child_process.spawn` 執行 `docker logs -f` 串流 log
4. Log 經過 server-side 過濾後即時推送到前端

## 關鍵檔案位置

| 功能 | 路徑 |
|------|------|
| 主要 UI 邏輯與狀態管理 | `client/src/App.tsx` |
| WebSocket 連線 Hook | `client/src/hooks/useWebSocket.ts` |
| Log 顯示與高亮 | `client/src/components/LogViewer.tsx` |
| 後端入口點 | `server/src/index.ts` |
| Docker/Podman 服務層 | `server/src/services/container.ts` |
| HTTP API 路由 | `server/src/routes/containers.ts` |
| WebSocket 處理 | `server/src/websocket/index.ts` |
| Vite 代理設定 | `client/vite.config.ts` |

## 技術棧

- **前端：** React 18 + TypeScript + Tailwind CSS 4 + Vite 6
- **後端：** Node.js + Express + ws (WebSocket)
- **開發工具：** tsx（TypeScript 執行器，無需 build 步驟）
- **Monorepo：** npm workspaces

## API 端點

**HTTP REST API (port 3001):**
- `GET /api/containers` — 取得所有容器列表
- `GET /api/containers/runtime` — 偵測 docker/podman 可用性
- `GET /api/containers/:id/logs` — 取得歷史 log（支援 `since`, `until`, `filter`, `tail` 參數）

**WebSocket (`/ws/logs`):**
- Client → Server: `{ type: 'start', containerId, filter?, tail? }` 或 `{ type: 'stop' }`
- Server → Client: `{ type: 'log', data }`, `{ type: 'started' }`, `{ type: 'end' }`, `{ type: 'error' }`

## 開發注意事項

- 後端服務層 (`container.ts`) 會自動偵測可用的容器運行時（優先 docker，其次 podman）
- Vite 開發伺服器已設定代理，將 `/api/*` 和 `/ws/*` 轉發到後端
- WebSocket Hook 內建自動重連機制（3 秒延遲）
- 過濾功能使用 300ms debounce 避免過度請求
- 目前專案尚無測試設定

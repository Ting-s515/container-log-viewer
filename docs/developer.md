# 開發者文件

本文件提供 Container Log Viewer 的技術細節，適合想要二次開發或貢獻代碼的開發者參考。

## 🛠️ 技術棧

| 類別 | 技術 | 說明 |
|:-----|:-----|:-----|
| **前端框架** | React 18 + TypeScript | 元件化開發、型別安全 |
| **樣式方案** | Tailwind CSS 4 | Utility-first CSS 框架 |
| **建構工具** | Vite | 極速開發體驗與 HMR |
| **後端框架** | Node.js + Express | 非同步 I/O 處理串流 |
| **即時通訊** | WebSocket (ws) | 雙向通訊推送 log |
| **容器互動** | Docker / Podman CLI | 透過 `child_process` 調用 |

## 📁 專案結構

```
container-log-viewer/
├── package.json                # Monorepo 根設定 (npm workspaces)
├── docker-compose.yml          # 容器化部署設定
├── .env.example                # 環境變數範本（port 設定）
│
├── client/                     # 前端 React 應用
│   ├── src/
│   │   ├── components/         # UI 元件
│   │   │   ├── ContainerSelect.tsx
│   │   │   ├── LogFilter.tsx
│   │   │   └── LogViewer.tsx
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts # WebSocket 連線 Hook
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── server/                     # 後端 Node.js 服務
│   ├── src/
│   │   ├── routes/
│   │   │   └── containers.ts   # HTTP API 路由
│   │   ├── services/
│   │   │   └── container.ts    # Docker/Podman 服務層
│   │   ├── websocket/
│   │   │   └── index.ts        # WebSocket 處理
│   │   └── index.ts
│   ├── tsconfig.json
│   └── package.json
│
└── docs/                       # 文件
```

## 📖 API 文件

### HTTP API

| 方法 | 端點 | 說明 |
|:-----|:-----|:-----|
| `GET` | `/api/containers` | 取得所有容器列表 |
| `GET` | `/api/containers/runtime` | 取得執行環境 (docker/podman) |
| `GET` | `/api/containers/:id/logs` | 取得指定容器的歷史 log |

#### 查詢參數 (歷史 log)

| 參數 | 類型 | 說明 | 範例 |
|:-----|:-----|:-----|:-----|
| `since` | string | 起始時間 (ISO 8601) | `2024-01-01T00:00:00` |
| `until` | string | 結束時間 (ISO 8601) | `2024-01-02T00:00:00` |
| `filter` | string | 關鍵字過濾 | `error` |
| `tail` | number | 最後 N 行 | `100` |

### WebSocket API

**連線端點：** `ws://localhost:3001/ws/logs`

#### 客戶端 → 伺服器

```jsonc
// 開始串流
{
  "type": "start",
  "containerId": "container_id",
  "filter": "keyword",    // 可選
  "tail": 100             // 可選，預設 100
}

// 停止串流
{ "type": "stop" }
```

#### 伺服器 → 客戶端

```jsonc
// Log 資料
{ "type": "log", "data": "log content..." }

// 串流開始確認
{ "type": "started", "containerId": "..." }

// 串流結束
{ "type": "end", "message": "Log stream ended" }

// 錯誤訊息
{ "type": "error", "message": "Error description" }
```

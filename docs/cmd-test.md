## 方便測試cmd log 的 ui工具
- why: 方便查看docker/podman 容器log，不必用指令行

### 需求規格
1. 我想開發一個方便查看容器log 的ui工具
2. 目前想到的功能有
   - 可以選擇容器名稱
   - 可以選擇查看log 的時間範圍
   - 可以選擇關鍵字過濾
   - 可以即時追蹤log
3. 語言不限，可以用web 技術開發
4. 希望能夠跨平台使用
5. 希望能夠支援多種容器管理工具，例如docker, podman 等
6. 希望能夠支援多種部署方式，例如本地部署，雲端部署等
7. 此為個人使用，只需有上述基本功能即可

---

### 可行性評估

#### 評估結論：✅ 完全可行

| 需求 | 可行性 | 技術實現方式 |
|------|--------|--------------|
| 選擇容器名稱 | ✅ | Docker/Podman API 或 CLI (`docker ps`) |
| 時間範圍過濾 | ✅ | `docker logs --since --until` 參數 |
| 關鍵字過濾 | ✅ | 後端串流過濾或前端即時過濾 |
| 即時追蹤 log | ✅ | `docker logs -f` + WebSocket 串流推送 |
| 跨平台 | ✅ | Web 技術天生跨平台 |
| 多容器工具支援 | ✅ | Docker/Podman CLI 指令高度相容 |
| 多種部署方式 | ✅ | Web 服務或打包為桌面應用 |

---

### 採用技術棧

#### 選定方案：Node.js + React + WebSocket

```
┌─────────────────────────────────────────────────────┐
│                    前端 (React)                      │
│  - 容器選擇下拉選單                                   │
│  - 時間範圍選擇器                                     │
│  - 關鍵字過濾輸入框                                   │
│  - Log 即時顯示區域（虛擬滾動優化）                    │
└─────────────────────┬───────────────────────────────┘
                      │ WebSocket
┌─────────────────────▼───────────────────────────────┐
│                  後端 (Node.js)                      │
│  - Express/Fastify HTTP API                         │
│  - WebSocket Server (ws/socket.io)                  │
│  - child_process 調用 Docker/Podman CLI             │
└─────────────────────┬───────────────────────────────┘
                      │ CLI
┌─────────────────────▼───────────────────────────────┐
│              Docker / Podman                         │
│  - docker ps (列出容器)                              │
│  - docker logs -f --since --until (取得 log)        │
└─────────────────────────────────────────────────────┘
```

#### 選擇理由

| 技術 | 理由 |
|------|------|
| **Node.js** | 非同步 I/O 處理 log 串流效能佳；`child_process` 可直接調用 CLI |
| **React** | 生態成熟、元件化開發、狀態管理方便 |
| **WebSocket** | 雙向通訊，即時推送 log 無需輪詢 |
| **CLI 而非 SDK** | Docker/Podman CLI 指令相容，一套程式碼支援兩者 |

#### 可選擴展

- **桌面應用打包**：Electron 或 Tauri（更輕量）
- **容器化部署**：提供 Dockerfile 可部署至任何環境

---

### 專案結構規劃

```
container-log-viewer/
├── client/                 # React 前端
│   ├── src/
│   │   ├── components/     # UI 元件
│   │   ├── hooks/          # 自訂 hooks (WebSocket 連線等)
│   │   └── App.tsx
│   └── package.json
├── server/                 # Node.js 後端
│   ├── src/
│   │   ├── routes/         # HTTP API 路由
│   │   ├── services/       # Docker/Podman 服務層
│   │   └── websocket/      # WebSocket 處理
│   └── package.json
├── docker-compose.yml      # 開發環境
└── README.md
```

---

### 核心 API 設計

```
GET  /api/containers              # 列出所有容器
GET  /api/containers/:id/logs     # 取得指定容器歷史 log
     ?since=2024-01-01T00:00:00
     &until=2024-01-02T00:00:00
     &filter=keyword

WS   /ws/logs/:containerId        # WebSocket 即時 log 串流
```
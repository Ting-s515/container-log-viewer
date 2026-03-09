# Container Log Viewer

輕量級 Web UI 工具，用於即時查看 Docker / Podman 容器的 log。

## ✨ 功能特色

- **多容器工具支援** — 自動偵測並支援 Docker 與 Podman
- **即時串流** — 透過 WebSocket 即時推送 log，無需手動刷新
- **關鍵字過濾** — 支援即時過濾與關鍵字高亮顯示
- **深色主題** — 護眼的深色介面，適合長時間使用

## 🚀 快速開始

### 環境需求

- **Node.js** 18+
- **Docker** 或 **Podman**（至少安裝其一）

### 安裝與啟動

```bash
git clone
cd ContainerLogViewer
npm install
npm run dev
```

啟動後開啟 http://localhost:5173 即可使用。

### 自訂 Port（可選）

若預設 port 衝突，可建立 `.env` 檔案：

```bash
# Linux / macOS
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

編輯 `.env`：

```bash
VITE_PORT=5173      # 前端
SERVER_PORT=3001    # 後端
```

## 🏗️ 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                    │
│  • 容器選擇下拉選單                                      │
│  • 關鍵字過濾輸入框                                      │
│  • Log 即時顯示區域（支援高亮）                          │
└─────────────────────┬───────────────────────────────────┘
                      │ WebSocket / HTTP
┌─────────────────────▼───────────────────────────────────┐
│                   Backend (Node.js)                     │
│  • Express HTTP API                                     │
│  • WebSocket Server                                     │
│  • child_process 調用 CLI                               │
└─────────────────────┬───────────────────────────────────┘
                      │ CLI Commands
┌─────────────────────▼───────────────────────────────────┐
│                  Docker / Podman                        │
│  • docker ps / podman ps                                │
│  • docker logs -f / podman logs -f                      │
└─────────────────────────────────────────────────────────┘
```

## 📋 可用指令

| 指令 | 說明 |
|:-----|:-----|
| `npm run dev` | 啟動開發伺服器（前後端） |
| `npm run build` | 建構生產版本 |
| `npm run start` | 啟動生產伺服器 |

## 🐳 運作原理

本工具透過 CLI 與本機 Docker/Podman Daemon 互動，**獨立運行、不需與其他專案整合**：

```
┌──────────────────────┐     ┌──────────────────────┐
│  Container Log       │     │  Your Other          │
│  Viewer (本工具)     │     │  Projects            │
└──────────┬───────────┘     └──────────┬───────────┘
           │ docker ps / logs           │ docker-compose up
           ▼                            ▼
    ┌─────────────────────────────────────────────┐
    │         Docker / Podman Daemon (本機)       │
    └─────────────────────────────────────────────┘
```

## 📦 Docker 部署

只需兩行指令，自動拉取 image 並啟動。

### Linux / macOS

```bash
curl -O https://raw.githubusercontent.com/Ting-s515/ContainerLogViewer/main/docker-compose.hub.yml
docker-compose -f docker-compose.hub.yml up -d
```

自訂 port：

```bash
CLIENT_PORT=8080 SERVER_PORT=3001 docker-compose -f docker-compose.hub.yml up -d
```

### Windows (PowerShell)

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Ting-s515/ContainerLogViewer/main/docker-compose.hub.yml" -OutFile "docker-compose.hub.yml"
docker-compose -f docker-compose.hub.yml up -d
```

自訂 port：

```powershell
$env:CLIENT_PORT=7070; $env:SERVER_PORT=7100; docker-compose -f docker-compose.hub.yml up -d
```

---

啟動後開啟 http://localhost（或自訂的 CLIENT_PORT）

> ⚠️ Linux/macOS 需掛載 `/var/run/docker.sock` 以存取主機 Docker Daemon

## 📖 開發者文件

技術細節、API 規格、專案結構請參閱 [docs/developer.md](docs/developer.md)

## 📄 License

[MIT License](LICENSE)

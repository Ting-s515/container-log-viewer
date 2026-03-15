# Repository Guidelines

## Project Structure & Module Organization
本專案為 npm workspaces monorepo：
- `client/`：React + Vite + TypeScript 前端，核心程式在 `client/src`，測試在 `client/src/**/__tests__`。
- `server/`：Express + WebSocket + TypeScript 後端，進入點為 `server/src/index.ts`。
- `docs/`：需求、修復紀錄與開發文件。
- 根目錄：共享設定（`.env`、`docker-compose*.yml`、workspace `package.json`）。

## Build, Test, and Development Commands
在 repo root 執行：
- `npm install`：安裝所有 workspace 依賴。
- `npm run dev`：同時啟動前後端（client 預設 `5173`、server 預設 `3001`）。
- `npm run build`：建置 client 與 server 產物。
- `npm run start`：以編譯後程式啟動後端。

常用子專案命令：
- `npm run test --workspace=client`：執行前端單元測試（Jest）。
- `npm run test:coverage --workspace=client`：輸出覆蓋率報告。

## Coding Style & Naming Conventions
- 語言：TypeScript（前後端皆採 ES module import）。
- 縮排：2 spaces；字串以單引號為主；保留現有分號風格。
- React：元件使用 `PascalCase`（如 `LogViewer.tsx`），hooks 使用 `useXxx`（如 `useLogStream.ts`）。
- 檔名：測試檔採 `*.test.ts` / `*.test.tsx` 並放入 `__tests__` 目錄。

## Testing Guidelines
- 目前主要測試框架為 Jest + Testing Library（client）。
- 新增前端邏輯時，至少涵蓋 happy path、邊界條件、錯誤情境。
- 若修改 hook/service，請同步補對應 `__tests__`。
- 提交前至少執行：`npm run test --workspace=client`。

## Commit & Pull Request Guidelines
- 歷史 commit 訊息多為短句，且中英混用（例如 `test: add hook tests`、`fix ...`）。
- 建議新提交採 Conventional Commits：`feature: ...`、`fix: ...`、`refactor: ...`、`docs: ...`。
- PR 需包含：
  - 變更摘要與影響範圍（client/server/docs）
  - 測試結果（執行命令與結果）
  - 若有 UI 調整，附截圖或短影片
  - 關聯 issue 或需求文件路徑

## Security & Configuration Tips
- 請勿提交真實 `.env` 機敏資訊；以 `.env.example` 為範本。
- 需要 Docker/Podman 權限才能讀取容器 log；本機請先確認 CLI 可用。

# Bug 修復紀錄

## Issue #1: 高頻日誌切換容器時畫面未清空

### 問題描述

當有一個容器每秒產生大量日誌（例如每秒超過 1000 行），切換下拉選單選擇其他容器後，畫面不會被清空，而是會繼續顯示前一個容器的日誌內容。

### 根本原因：雙層競態條件 (Race Condition)

此問題涉及**兩層競態條件**，需要分別處理：

---

## 第一層：前端批次緩衝區競態條件

### 問題分析

`useWebSocket.ts` 使用批次處理機制來減少高頻 log 造成的畫面閃爍：

```typescript
// log 累積到 pendingMessagesRef，500ms 後批次發送
if (message.type === 'log') {
  pendingMessagesRef.current.push(message);  // 舊 log 在這裡累積

  if (batchTimerRef.current === null) {
    batchTimerRef.current = window.setTimeout(() => {
      setBatchMessages([...pendingMessagesRef.current]); // 500ms 後觸發
      pendingMessagesRef.current = [];
    }, BATCH_INTERVAL_MS);  // 500ms
  }
}
```

### 競態條件發生順序

| 步驟 | 時間 | 動作 | 結果 |
|------|------|------|------|
| 1 | T+0ms | 舊容器高頻 log 累積到 `pendingMessagesRef` | 緩衝區有 100+ 條舊 log |
| 2 | T+100ms | 用戶切換容器，`setLogs([])` 執行 | 畫面清空 |
| 3 | T+100ms | `sendMessage({ type: 'start' })` 發送 | 後端開始新串流 |
| 4 | T+500ms | **批次計時器觸發** | `setBatchMessages()` 將舊 log 發送 |
| 5 | T+500ms | `App.tsx` 的 useEffect 處理 `batchMessages` | **舊 log 被加回畫面** |

### 時序圖

```
時間軸：
─────────────────────────────────────────────────────────────►
  │                    │                     │
  │  舊容器 log        │  用戶切換容器       │  批次計時器觸發
  │  累積到緩衝區      │  setLogs([])       │  舊 log 被加回畫面
  │                    │                     │
  ▼                    ▼                     ▼
```

### 缺陷位置

`useWebSocket.ts` 切換容器時缺少清除緩衝區的機制：

- `pendingMessagesRef.current`：切換時沒有被清空
- `batchTimerRef.current`：切換時沒有被取消

### 第一層修正方案

#### 1. `useWebSocket.ts` - 新增 `clearBuffer` 函數

```typescript
// 清除緩衝區：用於切換容器時，避免舊 log 在批次計時器觸發後被顯示
// 解決競態條件：當高頻 log 累積在 pendingMessagesRef 時，切換容器會導致舊 log 被加回畫面
const clearBuffer = useCallback(() => {
  // 清空累積中的 log 訊息
  pendingMessagesRef.current = [];
  // 取消正在等待的批次計時器
  if (batchTimerRef.current) {
    clearTimeout(batchTimerRef.current);
    batchTimerRef.current = null;
  }
  // 清空已發送但尚未處理的批次訊息
  setBatchMessages([]);
}, []);
```

#### 2. `App.tsx` - 切換容器時呼叫 `clearBuffer`

```typescript
const handleContainerChange = (containerId: string) => {
  setSelectedContainer(containerId);
  // 先清除 WebSocket 緩衝區，避免舊容器的累積 log 在批次計時器觸發後被顯示
  clearBuffer();
  setLogs([]);
  // ...
};
```

#### 3. `App.tsx` - 過濾條件變更時呼叫 `clearBuffer`

```typescript
const handleFilterChange = (newFilter: string) => {
  setFilter(newFilter);
  if (selectedContainer && isConnected) {
    // 清除緩衝區，避免舊過濾條件的 log 被顯示
    clearBuffer();
    setLogs([]);
    // ...
  }
};
```

---

## 第二層：網路傳輸競態條件

### 問題分析

第一層修復後，仍存在問題：在 `clearBuffer()` 執行後、後端收到 `start` 訊息並停止舊串流之前，舊容器的日誌可能仍透過網路傳送中。這些訊息到達前端後，會被加入新的緩衝區並顯示。

### 時序圖

```
時間軸：
────────────────────────────────────────────────────────────────►
  │              │                │                    │
clearBuffer()  sendMessage()   後端收到 start      後端停止舊串流
  │              │            並 stopStream()           │
  │              │                │                    │
  │        ←─────┼── 舊日誌仍在傳送中 ──┼─────→          │
  │              │    (網路延遲)       │                │
  ▼              ▼                ▼                    ▼

問題：clearBuffer 之後到達的舊日誌會被加入新緩衝區
```

### 缺陷位置

後端發送日誌時不包含容器識別資訊：

```typescript
// 原本的程式碼：沒有 containerId
ws.send(JSON.stringify({ type: 'log', data: lines }));
```

前端無法判斷收到的日誌屬於哪個容器。

### 第二層修正方案

#### 1. `server/src/websocket/index.ts` - 發送日誌時包含 `containerId`

```typescript
/**
 * 發送過濾後的 log 到客戶端
 * @param containerId - 容器 ID，讓前端可以判斷日誌是否屬於當前選擇的容器
 */
function sendFilteredLogs(ws: WebSocket, logs: string, containerId: string, filter?: string) {
  // ... 過濾邏輯 ...

  // 包含 containerId，讓前端可以過濾不屬於當前容器的日誌
  ws.send(JSON.stringify({ type: 'log', data: lines, containerId }));
}
```

#### 2. `client/src/App.tsx` - 處理日誌時過濾非當前容器的訊息

```typescript
// 處理批次 log 訊息
useEffect(() => {
  if (batchMessages.length === 0) return;
  if (!isStreaming) return;
  if (!selectedContainer) return;

  const now = new Date();

  // 只處理屬於當前選擇容器的日誌，避免切換容器時的競態條件
  const newEntries: LogEntry[] = batchMessages
    .filter((msg) => msg.data && msg.containerId === selectedContainer)
    .map((msg) => ({
      timestamp: now,
      text: msg.data as string,
    }));

  // ...
}, [batchMessages, isStreaming, maxLogs, selectedContainer]);
```

---

## 修復後完整流程

```
時間軸：
────────────────────────────────────────────────────────────────►
  │              │                │
clearBuffer()  sendMessage()   舊日誌到達（containerId=舊容器）
  │              │                │
  │              │                ↓
  │              │         前端檢查 containerId !== selectedContainer
  │              │                ↓
  │              │            【忽略】✓
  │              │
  │              │                        新日誌到達（containerId=新容器）
  │              │                                │
  │              │                                ↓
  │              │                         containerId === selectedContainer
  │              │                                ↓
  │              │                           【顯示】✓
```

---

## 修改檔案總覽

| 檔案 | 修改內容 |
|------|----------|
| `client/src/hooks/useWebSocket.ts` | 新增 `clearBuffer` 函數並導出 |
| `client/src/App.tsx` | 呼叫 `clearBuffer`；過濾非當前容器的日誌 |
| `server/src/websocket/index.ts` | 發送日誌時包含 `containerId` |

## 測試方式

使用 `docker-compose.test.yml` 建立測試環境：

```bash
# 啟動測試容器
docker compose -f docker-compose.test.yml up -d

# 啟動應用程式
npm run dev

# 測試完成後清理
docker compose -f docker-compose.test.yml down
```

測試步驟：
1. 選擇 `high-freq-log` 容器（大量 `[HIGH]` 日誌快速滾動）
2. 切換到 `low-freq-log` 容器
3. 確認畫面立即清空，只顯示 `[LOW]` 日誌

## 狀態

✅ 已修復

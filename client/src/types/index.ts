/**
 * 集中管理共用型別定義
 * 消除各檔案中的重複型別宣告，確保型別一致性
 */

/**
 * 容器資訊型別
 * 對應後端 /api/containers 回傳的容器資料結構
 */
export interface Container {
  id: string;      // 容器 ID
  name: string;    // 容器名稱
  image: string;   // 映像名稱
  status: string;  // 狀態描述（如 "Up 2 hours"）
  state: string;   // 執行狀態（running / exited 等）
}

/**
 * Log 項目型別
 * 包含接收時間與 log 內容，用於顯示與排序
 */
export interface LogEntry {
  timestamp: Date;  // 接收到 log 的時間
  text: string;     // log 內容
}

/**
 * WebSocket 訊息型別
 * 定義前後端 WebSocket 通訊的訊息格式
 */
export interface WsMessage {
  type: string;         // 訊息類型：log / started / end / error
  data?: string;        // log 類型的訊息內容
  message?: string;     // error 類型的錯誤訊息
  containerId?: string; // 日誌來源容器 ID，用於識別日誌歸屬，避免切換容器時的競態條件
}

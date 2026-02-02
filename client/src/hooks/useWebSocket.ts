import { useState, useEffect, useRef, useCallback } from 'react';

// WebSocket 訊息型別
interface WsMessage {
  type: string;
  data?: string;
  message?: string;
  // containerId 用於識別日誌來源，避免切換容器時的競態條件
  containerId?: string;
}

// 批次更新的間隔時間（毫秒）
// 收集此期間內的所有 log，一次性更新 UI，避免高頻更新導致畫面閃爍
const BATCH_INTERVAL_MS = 500;

/**
 * WebSocket 連線 Hook
 * 自動處理連線、重連、訊息收發
 * 支援批次更新：累積短時間內的 log 訊息，批次發送以減少 re-render 次數
 */
export function useWebSocket(path: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  // 批次訊息陣列，當有多條 log 累積時一次發送
  const [batchMessages, setBatchMessages] = useState<WsMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  // 累積中的 log 訊息緩衝區
  const pendingMessagesRef = useRef<WsMessage[]>([]);
  // 批次更新的 timer ID
  const batchTimerRef = useRef<number | null>(null);

  // 建立連線
  const connect = useCallback(() => {
    // 根據當前頁面 URL 判斷 WebSocket 地址
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}${path}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // log 類型訊息累積到緩衝區，批次更新以避免高頻 re-render
        if (message.type === 'log') {
          pendingMessagesRef.current.push(message);

          // 若尚未設定 timer，則啟動批次更新計時器
          if (batchTimerRef.current === null) {
            batchTimerRef.current = window.setTimeout(() => {
              // 將累積的訊息批次發送
              if (pendingMessagesRef.current.length > 0) {
                setBatchMessages([...pendingMessagesRef.current]);
                pendingMessagesRef.current = [];
              }
              batchTimerRef.current = null;
            }, BATCH_INTERVAL_MS);
          }
        } else {
          // 非 log 訊息（started, end, error 等）立即發送，確保控制訊息不被延遲
          setLastMessage(message);
        }
      } catch {
        // 非 JSON 格式的訊息，忽略
        console.warn('Invalid WebSocket message:', event.data);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);

      // 自動重連（3 秒後）
      reconnectTimeoutRef.current = window.setTimeout(() => {
        console.log('Attempting to reconnect...');
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [path]);

  // 發送訊息
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

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

  // 初始化連線
  useEffect(() => {
    connect();

    // 清理函數
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // 清除批次更新計時器，避免 memory leak
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastMessage,
    // 批次 log 訊息陣列，供上層組件一次處理多條 log
    batchMessages,
    sendMessage,
    // 清除緩衝區，用於切換容器時避免競態條件
    clearBuffer,
  };
}

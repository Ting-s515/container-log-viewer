/**
 * useLogStream Hook
 * 管理 log 狀態、串流控制、maxLogs 驗證
 * 將 log 相關的邏輯從 App.tsx 抽離，遵循單一職責原則
 */

import { useState, useEffect } from 'react';
import type { LogEntry, WsMessage } from '../types';

/**
 * Hook 參數型別
 */
interface UseLogStreamOptions {
  selectedContainer: string;  // 目前選中的容器 ID
  filter: string;             // 過濾關鍵字（用於辨識重新串流的時機）
  batchMessages: WsMessage[]; // 來自 WebSocket 的批次訊息
  clearBuffer: () => void;    // 清除 WebSocket 緩衝區的函數
}

/**
 * Hook 回傳值型別
 */
interface UseLogStreamResult {
  logs: LogEntry[];                           // log 項目陣列
  isStreaming: boolean;                       // 是否正在接收串流
  setIsStreaming: (value: boolean) => void;   // 設定串流狀態
  maxLogsInput: string;                       // maxLogs 輸入框的值
  maxLogsError: string;                       // maxLogs 輸入錯誤訊息
  handleMaxLogsChange: (value: string) => void; // 處理 maxLogs 輸入變更
  clearLogs: () => void;                      // 清空 log
}

/**
 * Log 串流管理 Hook
 * @param options - Hook 參數
 * @returns log 狀態與控制函數
 */
export function useLogStream(options: UseLogStreamOptions): UseLogStreamResult {
  const { selectedContainer, batchMessages } = options;

  // log 狀態：儲存帶有時間戳的 log 項目
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // 串流控制：是否接收新 log
  const [isStreaming, setIsStreaming] = useState<boolean>(true);

  // maxLogs 狀態：log 數量上限（0 表示不限制）
  const [maxLogs, setMaxLogs] = useState<number>(500);
  // 輸入框顯示值（允許用戶自由輸入）
  const [maxLogsInput, setMaxLogsInput] = useState<string>('500');
  // 輸入錯誤訊息
  const [maxLogsError, setMaxLogsError] = useState<string>('');

  /**
   * 處理批次 log 訊息
   * 將累積的多條 log 一次性加入，減少 re-render 次數
   */
  useEffect(() => {
    // batchMessages 為空陣列時不處理
    if (batchMessages.length === 0) return;

    // 若串流已關閉，忽略新 log
    if (!isStreaming) return;

    // 若尚未選擇容器，忽略
    if (!selectedContainer) return;

    // 取得當前時間作為這批 log 的時間戳
    const now = new Date();

    // 將批次訊息轉換為 LogEntry 陣列
    // 只處理屬於當前選擇容器的日誌，避免切換容器時的競態條件
    const newEntries: LogEntry[] = batchMessages
      .filter((msg) => msg.data && msg.containerId === selectedContainer)
      .map((msg) => ({
        timestamp: now,
        text: msg.data as string,
      }));

    // 無有效 log 則不更新
    if (newEntries.length === 0) return;

    setLogs((prev) => {
      const newLogs = [...prev, ...newEntries];
      // 若有設定上限且超過，則移除最舊的 log
      if (maxLogs > 0 && newLogs.length > maxLogs) {
        return newLogs.slice(-maxLogs);
      }
      return newLogs;
    });
  }, [batchMessages, isStreaming, maxLogs, selectedContainer]);

  /**
   * 處理 maxLogs 輸入變更
   * 允許自由輸入，驗證後顯示錯誤或更新實際值
   * @param value - 輸入框的值
   */
  const handleMaxLogsChange = (value: string): void => {
    // 允許用戶自由輸入（包括空字串）
    setMaxLogsInput(value);

    // 驗證輸入值：空字串
    if (value === '') {
      setMaxLogsError('Required');
      return;
    }

    const num = parseInt(value, 10);

    // 檢查是否為有效數字（必須是純數字）
    if (isNaN(num) || !/^\d+$/.test(value)) {
      setMaxLogsError('Invalid number');
      return;
    }

    // 檢查範圍：必須在 0~1000 之間
    if (num < 0 || num > 1000) {
      setMaxLogsError('Must be 0~1000');
      return;
    }

    // 驗證通過，清除錯誤並更新實際值
    setMaxLogsError('');
    setMaxLogs(num);
  };

  /**
   * 清空 log
   */
  const clearLogs = (): void => {
    setLogs([]);
  };

  return {
    logs,
    isStreaming,
    setIsStreaming,
    maxLogsInput,
    maxLogsError,
    handleMaxLogsChange,
    clearLogs,
  };
}

import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import ContainerSelect from './components/ContainerSelect';
import LogFilter from './components/LogFilter';
import LogViewer from './components/LogViewer';

// 容器資訊型別
interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
}

// Log 項目型別：包含接收時間與內容
export interface LogEntry {
  timestamp: Date;  // 接收到 log 的時間
  text: string;     // log 內容
}

function App() {
  // 容器列表與選中的容器
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('');

  // 過濾條件
  const [filter, setFilter] = useState<string>('');
  // 預設關閉自動捲動，避免 log 大量湧入時畫面高速閃爍
  const [isFollowing, setIsFollowing] = useState<boolean>(false);

  // 串流控制：是否接收新 log
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  // Log 數量上限（0 表示不限制）
  const [maxLogs, setMaxLogs] = useState<number>(500);
  // 輸入框顯示值（允許用戶自由輸入）
  const [maxLogsInput, setMaxLogsInput] = useState<string>('500');
  // 輸入錯誤訊息
  const [maxLogsError, setMaxLogsError] = useState<string>('');

  // Log 內容：儲存帶有時間戳的 log 項目
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // 記錄當前執行環境（docker/podman）
  const [runtime, setRuntime] = useState<string>('');

  // WebSocket 連線 hook
  // batchMessages: 批次累積的 log 訊息，減少高頻更新造成的畫面閃爍
  // clearBuffer: 清除緩衝區，用於切換容器時避免舊 log 被顯示
  const { isConnected, sendMessage, lastMessage, batchMessages, clearBuffer } = useWebSocket('/ws/logs');

  // 初始載入容器列表
  useEffect(() => {
    fetchContainers();
    fetchRuntime();
  }, []);

  // 處理批次 log 訊息：將累積的多條 log 一次性加入，減少 re-render 次數
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

  // 處理 WebSocket 收到的非 log 訊息（started, end, error 等控制訊息）
  useEffect(() => {
    if (!lastMessage) return;

    // log 訊息已由 batchMessages 處理，這裡只處理其他類型的訊息
    // 目前 lastMessage 只會收到非 log 類型訊息，但保留此判斷以防萬一
    if (lastMessage.type === 'log') return;

    // 可在此處理 started, end, error 等控制訊息
    // 目前暫無額外處理需求
  }, [lastMessage]);

  // 取得容器列表
  const fetchContainers = async () => {
    try {
      const res = await fetch('/api/containers');
      const json = await res.json();
      if (json.success) {
        setContainers(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch containers:', error);
    }
  };

  // 取得執行環境
  const fetchRuntime = async () => {
    try {
      const res = await fetch('/api/containers/runtime');
      const json = await res.json();
      if (json.success) {
        setRuntime(json.data.runtime || 'unknown');
      }
    } catch (error) {
      console.error('Failed to fetch runtime:', error);
    }
  };

  // 選擇容器時開始串流
  const handleContainerChange = (containerId: string) => {
    setSelectedContainer(containerId);
    // 先清除 WebSocket 緩衝區，避免舊容器的累積 log 在批次計時器觸發後被顯示
    // 這是修復高頻 log 切換容器時的競態條件問題
    clearBuffer();
    setLogs([]); // 清空舊 log

    if (containerId && isConnected) {
      // 發送開始串流指令
      sendMessage({
        type: 'start',
        containerId,
        filter,
        tail: 100,
      });
    }
  };

  // 過濾條件變更
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);

    // 如果已經在串流，重新開始以套用新過濾
    if (selectedContainer && isConnected) {
      // 清除緩衝區，避免舊過濾條件的 log 被顯示
      clearBuffer();
      setLogs([]);
      sendMessage({
        type: 'start',
        containerId: selectedContainer,
        filter: newFilter,
        tail: 100,
      });
    }
  };

  // 清空 log
  const handleClear = () => {
    setLogs([]);
  };

  // 處理 maxLogs 輸入變更：允許自由輸入，驗證後顯示錯誤或更新實際值
  const handleMaxLogsChange = (value: string) => {
    // 允許用戶自由輸入（包括空字串）
    setMaxLogsInput(value);

    // 驗證輸入值
    if (value === '') {
      setMaxLogsError('Required');
      return;
    }

    const num = parseInt(value, 10);

    // 檢查是否為有效數字
    if (isNaN(num) || !/^\d+$/.test(value)) {
      setMaxLogsError('Invalid number');
      return;
    }

    // 檢查範圍
    if (num < 0 || num > 1000) {
      setMaxLogsError('Must be 0~1000');
      return;
    }

    // 驗證通過，清除錯誤並更新實際值
    setMaxLogsError('');
    setMaxLogs(num);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header toolbar */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          {/* 第一行：Logo、選擇器、過濾、清除、連線狀態 */}
          <div className="flex items-center gap-4">
            {/* Logo with runtime indicator */}
            <h1 className="text-xl font-bold text-white whitespace-nowrap shrink-0">
              🐳 Container Log Viewer
              {runtime && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({runtime})
                </span>
              )}
            </h1>

            {/* Container selector */}
            <ContainerSelect
              containers={containers}
              value={selectedContainer}
              onChange={handleContainerChange}
            />

            {/* Keyword filter input */}
            <LogFilter value={filter} onChange={handleFilterChange} />

            {/* Clear button */}
            <button
              onClick={handleClear}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              Clear
            </button>

            {/* Connection status indicator - ml-auto 將其推到最右邊 */}
            <div className="flex items-center gap-2 ml-auto">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-xs text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* 第二行：Stream、Keep、Auto-scroll，對齊 Logo */}
          <div className="flex items-center gap-4 px-1">
            {/* Toggle: receive new logs */}
            <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={isStreaming}
                onChange={(e) => setIsStreaming(e.target.checked)}
                className="w-4 h-4 accent-green-500"
              />
              <span className="text-sm">Stream</span>
            </label>

            {/* Max logs input - only visible when streaming is enabled */}
            {isStreaming && (
              <div className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-sm text-gray-400">Keep</span>
                {/* 輸入框容器：relative 定位讓錯誤訊息對齊輸入框 */}
                <div className="relative">
                  <input
                    type="text"
                    value={maxLogsInput}
                    onChange={(e) => handleMaxLogsChange(e.target.value)}
                    placeholder="0~1000"
                    className={`w-20 px-2 py-1 bg-gray-700 border rounded text-sm text-white focus:outline-none ${
                      maxLogsError
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-gray-600 focus:border-blue-500'
                    }`}
                  />
                  {/* 錯誤訊息：顯示在輸入框下方，對齊輸入框左側 */}
                  {maxLogsError && (
                    <span className="absolute top-full left-0 mt-1 text-xs text-red-400">
                      {maxLogsError}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Auto-scroll toggle */}
            <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={isFollowing}
                onChange={(e) => setIsFollowing(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm">Auto-scroll</span>
            </label>
          </div>
        </div>
      </header>

      {/* Log display area */}
      <main className="p-4">
        <LogViewer logs={logs} isFollowing={isFollowing} filter={filter} />
      </main>
    </div>
  );
}

export default App;

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

function App() {
  // 容器列表與選中的容器
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('');

  // 過濾條件
  const [filter, setFilter] = useState<string>('');
  const [isFollowing, setIsFollowing] = useState<boolean>(true);

  // 串流控制：是否接收新 log
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  // Log 數量上限（0 表示不限制）
  const [maxLogs, setMaxLogs] = useState<number>(500);

  // Log 內容
  const [logs, setLogs] = useState<string[]>([]);

  // 記錄當前執行環境（docker/podman）
  const [runtime, setRuntime] = useState<string>('');

  // WebSocket 連線 hook
  const { isConnected, sendMessage, lastMessage } = useWebSocket('/ws/logs');

  // 初始載入容器列表
  useEffect(() => {
    fetchContainers();
    fetchRuntime();
  }, []);

  // 處理 WebSocket 收到的 log
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'log' && lastMessage.data) {
      // 若串流已關閉，忽略新 log
      if (!isStreaming) return;

      // 取出 data 並確保型別為 string（上面已經用 && lastMessage.data 確認不為 undefined）
      const logData = lastMessage.data as string;

      setLogs((prev) => {
        const newLogs = [...prev, logData];
        // 若有設定上限且超過，則移除最舊的 log
        if (maxLogs > 0 && newLogs.length > maxLogs) {
          return newLogs.slice(-maxLogs);
        }
        return newLogs;
      });
    }
  }, [lastMessage, isStreaming, maxLogs]);

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

  // 處理 maxLogs 輸入變更，限制範圍 0~1000
  const handleMaxLogsChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      setMaxLogs(0);
    } else {
      // 限制在 0~1000 之間
      setMaxLogs(Math.min(1000, Math.max(0, num)));
    }
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
                <input
                  type="number"
                  value={maxLogs}
                  onChange={(e) => handleMaxLogsChange(e.target.value)}
                  min={0}
                  max={1000}
                  className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                />
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

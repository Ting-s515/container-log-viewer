import { useState, useEffect, useRef } from 'react';
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
      setLogs((prev) => [...prev, lastMessage.data]);
    }
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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* 頂部工具列 */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-bold text-white">
            🐳 Container Log Viewer
            {runtime && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({runtime})
              </span>
            )}
          </h1>

          <div className="flex items-center gap-4 flex-wrap">
            {/* 容器選擇 */}
            <ContainerSelect
              containers={containers}
              value={selectedContainer}
              onChange={handleContainerChange}
            />

            {/* 關鍵字過濾 */}
            <LogFilter value={filter} onChange={handleFilterChange} />

            {/* 即時追蹤開關 */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFollowing}
                onChange={(e) => setIsFollowing(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm">即時追蹤</span>
            </label>

            {/* 清空按鈕 */}
            <button
              onClick={handleClear}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              清空
            </button>

            {/* 連線狀態 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-xs text-gray-400">
                {isConnected ? '已連線' : '未連線'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Log 顯示區域 */}
      <main className="p-4">
        <LogViewer logs={logs} isFollowing={isFollowing} filter={filter} />
      </main>
    </div>
  );
}

export default App;

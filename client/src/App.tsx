/**
 * App.tsx - 應用程式主元件
 * 遵循單一職責原則，只負責：
 * 1. 組合各個 Hook
 * 2. 協調 Hook 之間的互動
 * 3. 渲染 UI
 */

import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useContainers } from './hooks/useContainers';
import { useLogStream } from './hooks/useLogStream';
import ContainerSelect from './components/ContainerSelect';
import LogFilter from './components/LogFilter';
import LogViewer from './components/LogViewer';

function App() {
  // 容器列表與執行環境（由 useContainers Hook 管理）
  const { containers, runtime } = useContainers();

  // 選中的容器
  const [selectedContainer, setSelectedContainer] = useState<string>('');

  // 過濾條件
  const [filter, setFilter] = useState<string>('');
  // 預設關閉自動捲動，避免 log 大量湧入時畫面高速閃爍
  const [isFollowing, setIsFollowing] = useState<boolean>(false);

  // WebSocket 連線（由 useWebSocket Hook 管理）
  // batchMessages: 批次累積的 log 訊息，減少高頻更新造成的畫面閃爍
  // clearBuffer: 清除緩衝區，用於切換容器時避免舊 log 被顯示
  const { isConnected, sendMessage, batchMessages, clearBuffer } = useWebSocket('/ws/logs');

  // Log 串流狀態（由 useLogStream Hook 管理）
  const {
    logs,
    isStreaming,
    setIsStreaming,
    maxLogsInput,
    maxLogsError,
    handleMaxLogsChange,
    clearLogs,
  } = useLogStream({
    selectedContainer,
    filter,
    batchMessages,
    clearBuffer,
  });

  /**
   * 選擇容器時開始串流
   * @param containerId - 選中的容器 ID
   */
  const handleContainerChange = (containerId: string): void => {
    setSelectedContainer(containerId);
    // 切換容器時清空篩選條件，避免舊容器的 filter 影響新容器的顯示
    setFilter('');
    // 先清除 WebSocket 緩衝區，避免舊容器的累積 log 在批次計時器觸發後被顯示
    // 這是修復高頻 log 切換容器時的競態條件問題
    clearBuffer();
    clearLogs(); // 清空舊 log

    if (containerId && isConnected) {
      // 發送開始串流指令（filter 已清空，不傳遞舊的 filter）
      sendMessage({
        type: 'start',
        containerId,
        tail: 100,
      });
    }
  };

  /**
   * 過濾條件變更
   * @param newFilter - 新的過濾關鍵字
   */
  const handleFilterChange = (newFilter: string): void => {
    setFilter(newFilter);

    // 如果已經在串流，重新開始以套用新過濾
    if (selectedContainer && isConnected) {
      // 清除緩衝區，避免舊過濾條件的 log 被顯示
      clearBuffer();
      clearLogs();
      sendMessage({
        type: 'start',
        containerId: selectedContainer,
        filter: newFilter,
        tail: 100,
      });
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
              onClick={clearLogs}
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

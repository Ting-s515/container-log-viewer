import { useEffect, useRef } from 'react';
import type { LogEntry } from '../types';

// 從 types/index.ts 引入 LogEntry 型別，解除對 App.tsx 的循環依賴

interface LogViewerProps {
  logs: LogEntry[];  // 帶有時間戳的 log 項目陣列
  isFollowing: boolean;
  filter: string;
}

/**
 * Log display area
 * Supports auto-scroll (follow mode) and keyword highlighting
 */
function LogViewer({ logs, isFollowing, filter }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll: scroll to bottom when new logs arrive
  useEffect(() => {
    if (isFollowing && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, isFollowing]);

  /**
   * Highlight matching keywords in log text
   * @param text - Original log text
   * @param keyword - Keyword to highlight
   */
  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword) return text;

    // Case-insensitive regex search
    const regex = new RegExp(`(${escapeRegex(keyword)})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      // Apply highlight style to matched keywords
      if (part.toLowerCase() === keyword.toLowerCase()) {
        return (
          <span key={index} className="bg-yellow-500 text-black px-0.5 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  /**
   * Escape regex special characters to prevent user input errors
   */
  const escapeRegex = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  /**
   * 格式化時間戳為易讀的日期時間字串
   * 格式：YYYY-MM-DD HH:mm:ss
   */
  const formatTimestamp = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <div
      ref={containerRef}
      className="bg-gray-950 rounded-lg border border-gray-700 h-[calc(100vh-140px)] overflow-auto font-mono text-sm"
    >
      {logs.length === 0 ? (
        // Empty state message
        <div className="flex items-center justify-center h-full text-gray-500">
          Select a container to view logs
        </div>
      ) : (
        // Render log lines
        <div className="p-4">
          {logs.map((logEntry, chunkIndex) =>
            logEntry.text.split('\n').map((line, lineIndex) => {
              if (!line) return null;

              return (
                <div
                  key={`${chunkIndex}-${lineIndex}`}
                  className="leading-6 hover:bg-gray-800 whitespace-pre-wrap break-all"
                >
                  {/* 時間戳：使用青色醒目顯示，只在該 chunk 的第一行顯示 */}
                  {lineIndex === 0 && (
                    <span className="text-cyan-400 font-semibold mr-2 select-all">
                      [{formatTimestamp(logEntry.timestamp)}]
                    </span>
                  )}
                  {highlightKeyword(line, filter)}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default LogViewer;

import { useEffect, useRef } from 'react';

interface LogViewerProps {
  logs: string[];
  isFollowing: boolean;
  filter: string;
}

/**
 * Log 顯示區域
 * 支援即時追蹤（自動捲動到底部）與關鍵字高亮
 */
function LogViewer({ logs, isFollowing, filter }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 即時追蹤：新 log 進來時自動捲動到底部
  useEffect(() => {
    if (isFollowing && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, isFollowing]);

  /**
   * 將 log 文字中的關鍵字高亮顯示
   * @param text - 原始 log 文字
   * @param keyword - 要高亮的關鍵字
   */
  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword) return text;

    // 使用正則表達式做大小寫不敏感的搜尋
    const regex = new RegExp(`(${escapeRegex(keyword)})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      // 比對到的關鍵字加上高亮樣式
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
   * 轉義正則特殊字元，避免使用者輸入的字元被誤判
   */
  const escapeRegex = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  return (
    <div
      ref={containerRef}
      className="bg-gray-950 rounded-lg border border-gray-700 h-[calc(100vh-140px)] overflow-auto font-mono text-sm"
    >
      {logs.length === 0 ? (
        // 無 log 時顯示提示
        <div className="flex items-center justify-center h-full text-gray-500">
          請選擇容器以查看 log
        </div>
      ) : (
        // 逐行顯示 log
        <div className="p-4">
          {logs.map((logChunk, chunkIndex) =>
            logChunk.split('\n').map((line, lineIndex) => {
              if (!line) return null;

              return (
                <div
                  key={`${chunkIndex}-${lineIndex}`}
                  className="leading-6 hover:bg-gray-800 whitespace-pre-wrap break-all"
                >
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

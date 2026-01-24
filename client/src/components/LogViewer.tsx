import { useEffect, useRef } from 'react';

interface LogViewerProps {
  logs: string[];
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

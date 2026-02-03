/**
 * LogViewer 組件單元測試
 *
 * 測試 LogViewer 中的純邏輯函數：
 * - escapeRegex: 跳脫正則表達式特殊字元
 * - formatTimestamp: 格式化時間戳為 YYYY-MM-DD HH:mm:ss
 * - highlightKeyword: 高亮匹配的關鍵字
 *
 * 命名規範：Given條件_When動作_Should預期行為
 */

import { render, screen } from '@testing-library/react';
import LogViewer from '../LogViewer';
import type { LogEntry } from '../../types';

/**
 * 抽取 LogViewer 內部的 escapeRegex 函數邏輯進行獨立測試
 * 此函數用於跳脫正則表達式特殊字元，避免使用者輸入造成 regex 錯誤
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * 抽取 LogViewer 內部的 formatTimestamp 函數邏輯進行獨立測試
 * 此函數用於將 Date 物件格式化為 YYYY-MM-DD HH:mm:ss 字串
 */
const formatTimestamp = (date: Date): string => {
  const year = date.getFullYear();
  // getMonth() 返回 0-11，需 +1 轉換為 1-12
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

describe('LogViewer', () => {
  describe('escapeRegex', () => {
    it('GivenStringWithSpecialChars_WhenEscapeRegex_ShouldEscapeAllSpecialChars', () => {
      // Given - 包含所有正則特殊字元的字串
      const input = '.*+?^${}()|[]\\';

      // When - 執行跳脫
      const result = escapeRegex(input);

      // Then - 所有特殊字元應被跳脫（前面加上反斜線）
      expect(result).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    it('GivenEmptyString_WhenEscapeRegex_ShouldReturnEmptyString', () => {
      // Given - 空字串
      const input = '';

      // When - 執行跳脫
      const result = escapeRegex(input);

      // Then - 應返回空字串
      expect(result).toBe('');
    });

    it('GivenStringWithoutSpecialChars_WhenEscapeRegex_ShouldReturnOriginalString', () => {
      // Given - 不含特殊字元的普通字串
      const input = 'hello world 123';

      // When - 執行跳脫
      const result = escapeRegex(input);

      // Then - 應返回原始字串
      expect(result).toBe('hello world 123');
    });

    it('GivenMixedString_WhenEscapeRegex_ShouldOnlyEscapeSpecialChars', () => {
      // Given - 混合普通字元與特殊字元的字串（常見的搜尋情境）
      const input = 'error: [ERROR] file.txt';

      // When - 執行跳脫
      const result = escapeRegex(input);

      // Then - 只有特殊字元被跳脫，普通字元保持不變
      expect(result).toBe('error: \\[ERROR\\] file\\.txt');
    });
  });

  describe('formatTimestamp', () => {
    it('GivenValidDate_WhenFormatTimestamp_ShouldReturnFormattedString', () => {
      // Given - 有效的 Date 物件（2024-12-25 14:30:45）
      const date = new Date(2024, 11, 25, 14, 30, 45); // 月份從 0 開始，11 = 12月

      // When - 格式化時間戳
      const result = formatTimestamp(date);

      // Then - 應返回 YYYY-MM-DD HH:mm:ss 格式
      expect(result).toBe('2024-12-25 14:30:45');
    });

    it('GivenDateWithSingleDigits_WhenFormatTimestamp_ShouldPadWithZeros', () => {
      // Given - 月份/日期/時間為個位數的 Date（2024-01-05 09:05:03）
      const date = new Date(2024, 0, 5, 9, 5, 3); // 月份 0 = 1月

      // When - 格式化時間戳
      const result = formatTimestamp(date);

      // Then - 個位數應補零
      expect(result).toBe('2024-01-05 09:05:03');
    });

    it('GivenMidnightDate_WhenFormatTimestamp_ShouldShowZeroTime', () => {
      // Given - 午夜時間（2024-06-15 00:00:00）
      const date = new Date(2024, 5, 15, 0, 0, 0);

      // When - 格式化時間戳
      const result = formatTimestamp(date);

      // Then - 時間部分應顯示 00:00:00
      expect(result).toBe('2024-06-15 00:00:00');
    });

    it('GivenEndOfDayDate_WhenFormatTimestamp_ShouldShowCorrectTime', () => {
      // Given - 接近午夜的時間（2024-12-31 23:59:59）
      const date = new Date(2024, 11, 31, 23, 59, 59);

      // When - 格式化時間戳
      const result = formatTimestamp(date);

      // Then - 應正確顯示
      expect(result).toBe('2024-12-31 23:59:59');
    });
  });

  describe('highlightKeyword 渲染行為', () => {
    // 測試輔助函數：建立 LogEntry
    const createLogEntry = (text: string): LogEntry => ({
      timestamp: new Date(2024, 0, 1, 12, 0, 0),
      text,
    });

    it('GivenKeywordExists_WhenRenderLogViewer_ShouldHighlightKeyword', () => {
      // Given - log 內容包含關鍵字
      const logs: LogEntry[] = [createLogEntry('This is an error message')];

      // When - 渲染 LogViewer 並設定 filter
      render(<LogViewer logs={logs} isFollowing={false} filter="error" />);

      // Then - 關鍵字應被包裹在 highlight span 中
      const highlightedElement = screen.getByText('error');
      expect(highlightedElement).toHaveClass('bg-yellow-500');
    });

    it('GivenEmptyKeyword_WhenRenderLogViewer_ShouldNotHighlight', () => {
      // Given - log 內容存在但 filter 為空
      const logs: LogEntry[] = [createLogEntry('This is a normal message')];

      // When - 渲染 LogViewer 且 filter 為空
      render(<LogViewer logs={logs} isFollowing={false} filter="" />);

      // Then - 不應有 highlight class
      const container = screen.getByText(/This is a normal message/);
      expect(container.querySelector('.bg-yellow-500')).toBeNull();
    });

    it('GivenCaseInsensitiveKeyword_WhenRenderLogViewer_ShouldHighlightAllMatches', () => {
      // Given - log 內容包含不同大小寫的關鍵字
      const logs: LogEntry[] = [createLogEntry('ERROR error Error')];

      // When - 渲染 LogViewer 並以小寫搜尋
      render(<LogViewer logs={logs} isFollowing={false} filter="error" />);

      // Then - 所有大小寫變體都應被高亮
      const highlightedElements = screen.getAllByText(/error/i);
      // 篩選出有 highlight class 的元素
      const highlighted = highlightedElements.filter((el) =>
        el.classList.contains('bg-yellow-500')
      );
      expect(highlighted).toHaveLength(3);
    });

    it('GivenKeywordWithRegexSpecialChars_WhenRenderLogViewer_ShouldHighlightLiterally', () => {
      // Given - log 內容包含正則特殊字元，關鍵字也包含特殊字元
      const logs: LogEntry[] = [createLogEntry('file.txt [info] test.log')];

      // When - 渲染 LogViewer 並搜尋包含特殊字元的關鍵字
      render(<LogViewer logs={logs} isFollowing={false} filter="[info]" />);

      // Then - 應正確匹配字面字串而非 regex pattern
      const highlightedElement = screen.getByText('[info]');
      expect(highlightedElement).toHaveClass('bg-yellow-500');
    });

    it('GivenKeywordNotInText_WhenRenderLogViewer_ShouldShowNoMatchMessage', () => {
      // Given - log 內容不包含關鍵字
      const logs: LogEntry[] = [createLogEntry('This is a normal message')];

      // When - 渲染 LogViewer 並搜尋不存在的關鍵字
      render(<LogViewer logs={logs} isFollowing={false} filter="xyz123" />);

      // Then - 前端過濾會移除不符合的 log，應顯示「No logs match the filter」
      // （這是新增前端過濾功能後的預期行為）
      expect(screen.getByText('No logs match the filter')).toBeInTheDocument();
      // 原始文字不應顯示（因為被過濾掉了）
      expect(screen.queryByText(/This is a normal message/)).not.toBeInTheDocument();
    });
  });

  describe('空狀態渲染', () => {
    it('GivenEmptyLogs_WhenRenderLogViewer_ShouldShowEmptyMessage', () => {
      // Given - logs 為空陣列
      const logs: LogEntry[] = [];

      // When - 渲染 LogViewer
      render(<LogViewer logs={logs} isFollowing={false} filter="" />);

      // Then - 應顯示空狀態提示訊息
      expect(screen.getByText('Select a container to view logs')).toBeInTheDocument();
    });

    it('GivenLogsExist_WhenRenderLogViewer_ShouldNotShowEmptyMessage', () => {
      // Given - logs 包含資料
      const logs: LogEntry[] = [
        { timestamp: new Date(), text: 'Some log content' },
      ];

      // When - 渲染 LogViewer
      render(<LogViewer logs={logs} isFollowing={false} filter="" />);

      // Then - 不應顯示空狀態提示
      expect(screen.queryByText('Select a container to view logs')).not.toBeInTheDocument();
    });
  });

  describe('時間戳顯示', () => {
    it('GivenLogEntry_WhenRenderLogViewer_ShouldDisplayFormattedTimestamp', () => {
      // Given - log entry 包含特定時間戳
      const logs: LogEntry[] = [
        { timestamp: new Date(2024, 5, 15, 14, 30, 45), text: 'Test log' },
      ];

      // When - 渲染 LogViewer
      render(<LogViewer logs={logs} isFollowing={false} filter="" />);

      // Then - 應顯示格式化的時間戳
      expect(screen.getByText('[2024-06-15 14:30:45]')).toBeInTheDocument();
    });
  });

  describe('filteredLogs 前端過濾邏輯', () => {
    // 測試輔助函數：建立 LogEntry
    const createLogEntry = (text: string, timestamp?: Date): LogEntry => ({
      timestamp: timestamp ?? new Date(2024, 0, 1, 12, 0, 0),
      text,
    });

    it('GivenFilterHasValue_WhenRenderLogViewer_ShouldOnlyShowMatchingLines', () => {
      // Given - log 包含多行，只有部分包含關鍵字
      const logs: LogEntry[] = [
        createLogEntry('error: something went wrong\ninfo: all good\nerror: another issue'),
      ];

      // When - 渲染 LogViewer 並設定 filter 為 "error"
      render(<LogViewer logs={logs} isFollowing={false} filter="error" />);

      // Then - 應只顯示包含 "error" 的行
      // 注意：highlightKeyword 會把文字拆成多個元素，所以用 getAllByText 找 highlight 的部分
      const highlightedElements = screen.getAllByText('error');
      // 應有 2 個 "error" 被高亮（兩行各一個）
      expect(highlightedElements).toHaveLength(2);
      highlightedElements.forEach((el) => {
        expect(el).toHaveClass('bg-yellow-500');
      });

      // "info: all good" 不應顯示（因為不符合 filter）
      expect(screen.queryByText(/info: all good/)).not.toBeInTheDocument();
    });

    it('GivenEmptyFilter_WhenRenderLogViewer_ShouldShowAllLogs', () => {
      // Given - log 包含多行
      const logs: LogEntry[] = [
        createLogEntry('line 1\nline 2\nline 3'),
      ];

      // When - 渲染 LogViewer 且 filter 為空
      render(<LogViewer logs={logs} isFollowing={false} filter="" />);

      // Then - 應顯示所有行
      expect(screen.getByText(/line 1/)).toBeInTheDocument();
      expect(screen.getByText(/line 2/)).toBeInTheDocument();
      expect(screen.getByText(/line 3/)).toBeInTheDocument();
    });

    it('GivenLogEntryWithNoMatchingLines_WhenRenderLogViewer_ShouldRemoveEntireEntry', () => {
      // Given - 兩個 logEntry，其中一個完全不符合 filter
      const logs: LogEntry[] = [
        createLogEntry('error: first entry', new Date(2024, 0, 1, 10, 0, 0)),
        // 注意：這個 entry 不包含 "error" 關鍵字
        createLogEntry('info: second entry\ndebug: all good', new Date(2024, 0, 1, 11, 0, 0)),
      ];

      // When - 渲染 LogViewer 並設定 filter 為 "error"
      render(<LogViewer logs={logs} isFollowing={false} filter="error" />);

      // Then - 第一個 entry 應顯示（包含 "error"）
      // 使用 getAllByText 因為可能有多個 "error"，然後檢查第一個
      const highlightedElements = screen.getAllByText('error');
      expect(highlightedElements[0]).toHaveClass('bg-yellow-500');
      expect(screen.getByText('[2024-01-01 10:00:00]')).toBeInTheDocument();

      // 第二個 entry 完全不符合，應被移除（包括時間戳）
      expect(screen.queryByText(/info: second entry/)).not.toBeInTheDocument();
      expect(screen.queryByText(/debug: all good/)).not.toBeInTheDocument();
      expect(screen.queryByText('[2024-01-01 11:00:00]')).not.toBeInTheDocument();
    });

    it('GivenAllLogsNotMatchingFilter_WhenRenderLogViewer_ShouldShowNoMatchMessage', () => {
      // Given - 所有 log 都不符合 filter
      const logs: LogEntry[] = [
        createLogEntry('info: all good'),
        createLogEntry('debug: some debug info'),
      ];

      // When - 渲染 LogViewer 並設定一個不存在的 filter
      render(<LogViewer logs={logs} isFollowing={false} filter="nonexistent" />);

      // Then - 應顯示「No logs match the filter」訊息
      expect(screen.getByText('No logs match the filter')).toBeInTheDocument();
      // 不應顯示「Select a container to view logs」（因為 logs 不為空）
      expect(screen.queryByText('Select a container to view logs')).not.toBeInTheDocument();
    });

    it('GivenCaseInsensitiveFilter_WhenRenderLogViewer_ShouldMatchRegardlessOfCase', () => {
      // Given - log 包含不同大小寫的關鍵字
      const logs: LogEntry[] = [
        createLogEntry('ERROR: uppercase\nerror: lowercase\nError: mixed case\ninfo: no match'),
      ];

      // When - 渲染 LogViewer 並以小寫搜尋 "error"
      render(<LogViewer logs={logs} isFollowing={false} filter="error" />);

      // Then - 所有大小寫變體都應被高亮顯示
      // highlightKeyword 會把匹配的關鍵字包在 span 中，所以用 getAllByText 找
      const highlightedElements = screen.getAllByText(/^(ERROR|error|Error)$/i);
      const highlighted = highlightedElements.filter((el) =>
        el.classList.contains('bg-yellow-500')
      );
      // 應有 3 個不同大小寫的 "error" 被高亮
      expect(highlighted).toHaveLength(3);

      // "info: no match" 不應顯示（被前端過濾移除）
      expect(screen.queryByText(/info: no match/)).not.toBeInTheDocument();
    });

    it('GivenMultipleLogEntries_WhenFilterApplied_ShouldFilterEachEntryIndependently', () => {
      // Given - 多個 logEntry，每個有不同的符合程度
      const logs: LogEntry[] = [
        createLogEntry('error: entry1 line1\ninfo: entry1 line2', new Date(2024, 0, 1, 10, 0, 0)),
        createLogEntry('error: entry2 line1\nerror: entry2 line2', new Date(2024, 0, 1, 11, 0, 0)),
        createLogEntry('info: entry3 line1', new Date(2024, 0, 1, 12, 0, 0)),
      ];

      // When - 渲染 LogViewer 並設定 filter 為 "error"
      render(<LogViewer logs={logs} isFollowing={false} filter="error" />);

      // Then - 每個 entry 應獨立過濾
      // 應有 3 個 "error" 被高亮（entry1 有 1 個，entry2 有 2 個）
      const highlightedElements = screen.getAllByText('error');
      expect(highlightedElements).toHaveLength(3);
      highlightedElements.forEach((el) => {
        expect(el).toHaveClass('bg-yellow-500');
      });

      // Entry 1 的 "info: entry1 line2" 不應顯示
      expect(screen.queryByText(/info: entry1 line2/)).not.toBeInTheDocument();

      // Entry 3: 完全不符合，整個 entry 被移除（包括時間戳）
      expect(screen.queryByText(/info: entry3 line1/)).not.toBeInTheDocument();
      expect(screen.queryByText('[2024-01-01 12:00:00]')).not.toBeInTheDocument();

      // 應該只有 2 個時間戳顯示（entry1 和 entry2）
      expect(screen.getByText('[2024-01-01 10:00:00]')).toBeInTheDocument();
      expect(screen.getByText('[2024-01-01 11:00:00]')).toBeInTheDocument();
    });
  });
});

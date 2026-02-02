/**
 * useLogStream Hook 單元測試
 *
 * 測試 log 狀態管理、串流控制、maxLogs 驗證
 * 命名規範：Given條件_When動作_Should預期行為
 */

import { renderHook, act } from '@testing-library/react';
import { useLogStream } from '../useLogStream';
import type { WsMessage } from '../../types';

describe('useLogStream', () => {
  // 建立預設的 hook 參數，便於各測試覆寫
  const createDefaultOptions = (overrides = {}) => ({
    selectedContainer: 'container-123',
    filter: '',
    batchMessages: [] as WsMessage[],
    clearBuffer: jest.fn(),
    ...overrides,
  });

  describe('初始狀態', () => {
    it('GivenHookMounts_WhenInitialized_ShouldHaveEmptyLogsArray', () => {
      // Given & When - Hook 初始化
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );

      // Then - logs 初始應為空陣列
      expect(result.current.logs).toEqual([]);
    });

    it('GivenHookMounts_WhenInitialized_ShouldHaveIsStreamingTrue', () => {
      // Given & When - Hook 初始化
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );

      // Then - isStreaming 預設應為 true
      expect(result.current.isStreaming).toBe(true);
    });

    it('GivenHookMounts_WhenInitialized_ShouldHaveDefaultMaxLogsInput500', () => {
      // Given & When - Hook 初始化
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );

      // Then - maxLogsInput 預設應為 '500'
      expect(result.current.maxLogsInput).toBe('500');
    });

    it('GivenHookMounts_WhenInitialized_ShouldHaveNoMaxLogsError', () => {
      // Given & When - Hook 初始化
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );

      // Then - maxLogsError 初始應為空字串
      expect(result.current.maxLogsError).toBe('');
    });
  });

  describe('批次訊息處理', () => {
    it('GivenValidBatchMessages_WhenReceived_ShouldAddLogEntries', () => {
      // Given - 初始化 Hook
      const initialOptions = createDefaultOptions();
      const { result, rerender } = renderHook(
        (props) => useLogStream(props),
        { initialProps: initialOptions }
      );

      // When - 收到批次訊息
      const batchMessages: WsMessage[] = [
        { type: 'log', data: 'Log line 1', containerId: 'container-123' },
        { type: 'log', data: 'Log line 2', containerId: 'container-123' },
      ];
      rerender({ ...initialOptions, batchMessages });

      // Then - logs 應包含對應的 entries
      expect(result.current.logs).toHaveLength(2);
      expect(result.current.logs[0].text).toBe('Log line 1');
      expect(result.current.logs[1].text).toBe('Log line 2');
    });

    it('GivenEmptyBatchMessages_WhenReceived_ShouldNotUpdateLogs', () => {
      // Given - 初始化 Hook
      const initialOptions = createDefaultOptions({ batchMessages: [] });
      const { result, rerender } = renderHook(
        (props) => useLogStream(props),
        { initialProps: initialOptions }
      );

      // When - 收到空的批次訊息
      rerender({ ...initialOptions, batchMessages: [] });

      // Then - logs 應維持空陣列
      expect(result.current.logs).toEqual([]);
    });

    it('GivenIsStreamingFalse_WhenBatchMessagesReceived_ShouldIgnoreNewLogs', () => {
      // Given - 初始化 Hook 並關閉串流
      const initialOptions = createDefaultOptions();
      const { result, rerender } = renderHook(
        (props) => useLogStream(props),
        { initialProps: initialOptions }
      );

      // 關閉串流
      act(() => {
        result.current.setIsStreaming(false);
      });

      // When - 收到批次訊息
      const batchMessages: WsMessage[] = [
        { type: 'log', data: 'Should be ignored', containerId: 'container-123' },
      ];
      rerender({ ...initialOptions, batchMessages });

      // Then - logs 應維持空陣列
      expect(result.current.logs).toEqual([]);
    });

    it('GivenNoSelectedContainer_WhenBatchMessagesReceived_ShouldIgnoreNewLogs', () => {
      // Given - 未選擇容器
      const initialOptions = createDefaultOptions({ selectedContainer: '' });
      const { result, rerender } = renderHook(
        (props) => useLogStream(props),
        { initialProps: initialOptions }
      );

      // When - 收到批次訊息
      const batchMessages: WsMessage[] = [
        { type: 'log', data: 'Should be ignored', containerId: 'container-123' },
      ];
      rerender({ ...initialOptions, batchMessages });

      // Then - logs 應維持空陣列
      expect(result.current.logs).toEqual([]);
    });

    it('GivenDifferentContainerId_WhenBatchMessagesReceived_ShouldFilterOutMismatchedLogs', () => {
      // Given - 選擇 container-123
      const initialOptions = createDefaultOptions({ selectedContainer: 'container-123' });
      const { result, rerender } = renderHook(
        (props) => useLogStream(props),
        { initialProps: initialOptions }
      );

      // When - 收到來自不同容器的訊息
      const batchMessages: WsMessage[] = [
        { type: 'log', data: 'From correct container', containerId: 'container-123' },
        { type: 'log', data: 'From wrong container', containerId: 'container-456' },
      ];
      rerender({ ...initialOptions, batchMessages });

      // Then - 只應包含符合 containerId 的 log
      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0].text).toBe('From correct container');
    });

    it('GivenMessageWithoutData_WhenBatchMessagesReceived_ShouldFilterOutEmptyMessages', () => {
      // Given - 初始化 Hook
      const initialOptions = createDefaultOptions();
      const { result, rerender } = renderHook(
        (props) => useLogStream(props),
        { initialProps: initialOptions }
      );

      // When - 收到部分訊息沒有 data
      const batchMessages: WsMessage[] = [
        { type: 'log', data: 'Valid log', containerId: 'container-123' },
        { type: 'log', data: '', containerId: 'container-123' },  // 空 data
        { type: 'log', containerId: 'container-123' } as WsMessage,  // 無 data 屬性
      ];
      rerender({ ...initialOptions, batchMessages });

      // Then - 只應包含有有效 data 的 log
      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0].text).toBe('Valid log');
    });
  });

  describe('maxLogs 限制', () => {
    it('GivenMaxLogs500_WhenLogsExceedLimit_ShouldTrimOldestLogs', () => {
      // Given - 初始化 Hook（預設 maxLogs 為 500）
      const initialOptions = createDefaultOptions();
      const { result, rerender } = renderHook(
        (props) => useLogStream(props),
        { initialProps: initialOptions }
      );

      // When - 新增超過 500 筆的 log
      // 先加入 498 筆
      const firstBatch: WsMessage[] = Array.from({ length: 498 }, (_, i) => ({
        type: 'log' as const,
        data: `Log ${i + 1}`,
        containerId: 'container-123',
      }));
      rerender({ ...initialOptions, batchMessages: firstBatch });

      // 再加入 5 筆，總共 503 筆，超過 500 限制
      const secondBatch: WsMessage[] = Array.from({ length: 5 }, (_, i) => ({
        type: 'log' as const,
        data: `New Log ${i + 1}`,
        containerId: 'container-123',
      }));
      rerender({ ...initialOptions, batchMessages: secondBatch });

      // Then - logs 應被限制在 500 筆，最舊的被移除
      expect(result.current.logs).toHaveLength(500);
      // 最舊的 3 筆（Log 1, Log 2, Log 3）應被移除
      expect(result.current.logs[0].text).toBe('Log 4');
      // 最新的應是 New Log 5
      expect(result.current.logs[499].text).toBe('New Log 5');
    });

    it('GivenMaxLogsSetToZero_WhenLogsAccumulate_ShouldNotTrimLogs', () => {
      // Given - 初始化 Hook 並設定 maxLogs 為 0（不限制）
      const initialOptions = createDefaultOptions();
      const { result, rerender } = renderHook(
        (props) => useLogStream(props),
        { initialProps: initialOptions }
      );

      // 設定 maxLogs 為 0
      act(() => {
        result.current.handleMaxLogsChange('0');
      });

      // When - 加入多筆 log
      const batchMessages: WsMessage[] = Array.from({ length: 1000 }, (_, i) => ({
        type: 'log' as const,
        data: `Log ${i + 1}`,
        containerId: 'container-123',
      }));
      rerender({ ...initialOptions, batchMessages });

      // Then - 所有 log 都應保留
      expect(result.current.logs).toHaveLength(1000);
    });
  });

  describe('handleMaxLogsChange 驗證', () => {
    it('GivenValidNumber_WhenInputChanges_ShouldUpdateMaxLogsInput', () => {
      // Given - 初始化 Hook
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );

      // When - 輸入有效數字
      act(() => {
        result.current.handleMaxLogsChange('100');
      });

      // Then - maxLogsInput 應更新，無錯誤
      expect(result.current.maxLogsInput).toBe('100');
      expect(result.current.maxLogsError).toBe('');
    });

    it('GivenEmptyString_WhenInputChanges_ShouldShowRequiredError', () => {
      // Given - 初始化 Hook
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );

      // When - 輸入空字串
      act(() => {
        result.current.handleMaxLogsChange('');
      });

      // Then - 應顯示 Required 錯誤
      expect(result.current.maxLogsInput).toBe('');
      expect(result.current.maxLogsError).toBe('Required');
    });

    it('GivenNonNumericString_WhenInputChanges_ShouldShowInvalidNumberError', () => {
      // Given - 初始化 Hook
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );

      // When - 輸入非數字
      act(() => {
        result.current.handleMaxLogsChange('abc');
      });

      // Then - 應顯示 Invalid number 錯誤
      expect(result.current.maxLogsInput).toBe('abc');
      expect(result.current.maxLogsError).toBe('Invalid number');
    });

    it('GivenMixedAlphanumeric_WhenInputChanges_ShouldShowInvalidNumberError', () => {
      // Given - 初始化 Hook
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );

      // When - 輸入混合字元
      act(() => {
        result.current.handleMaxLogsChange('12abc');
      });

      // Then - 應顯示 Invalid number 錯誤
      expect(result.current.maxLogsInput).toBe('12abc');
      expect(result.current.maxLogsError).toBe('Invalid number');
    });

    it('GivenNegativeNumber_WhenInputChanges_ShouldShowRangeError', () => {
      // Given - 初始化 Hook
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );

      // When - 輸入負數
      act(() => {
        result.current.handleMaxLogsChange('-1');
      });

      // Then - 應顯示 Invalid number 錯誤（因為 -1 不符合 /^\d+$/ 正規表達式）
      expect(result.current.maxLogsInput).toBe('-1');
      expect(result.current.maxLogsError).toBe('Invalid number');
    });

    it('GivenNumberExceeds1000_WhenInputChanges_ShouldShowRangeError', () => {
      // Given - 初始化 Hook
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );

      // When - 輸入超過 1000
      act(() => {
        result.current.handleMaxLogsChange('1001');
      });

      // Then - 應顯示範圍錯誤
      expect(result.current.maxLogsInput).toBe('1001');
      expect(result.current.maxLogsError).toBe('Must be 0~1000');
    });

    it('GivenZero_WhenInputChanges_ShouldBeValidAndMeanUnlimited', () => {
      // Given - 初始化 Hook
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );

      // When - 輸入 0（表示不限制）
      act(() => {
        result.current.handleMaxLogsChange('0');
      });

      // Then - 應為有效值，無錯誤
      expect(result.current.maxLogsInput).toBe('0');
      expect(result.current.maxLogsError).toBe('');
    });

    it('GivenBoundaryValue1000_WhenInputChanges_ShouldBeValid', () => {
      // Given - 初始化 Hook
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );

      // When - 輸入邊界值 1000
      act(() => {
        result.current.handleMaxLogsChange('1000');
      });

      // Then - 應為有效值，無錯誤
      expect(result.current.maxLogsInput).toBe('1000');
      expect(result.current.maxLogsError).toBe('');
    });

    it('GivenDecimalNumber_WhenInputChanges_ShouldShowInvalidNumberError', () => {
      // Given - 初始化 Hook
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );

      // When - 輸入小數
      act(() => {
        result.current.handleMaxLogsChange('10.5');
      });

      // Then - 應顯示 Invalid number 錯誤（因為小數點不符合 /^\d+$/）
      expect(result.current.maxLogsInput).toBe('10.5');
      expect(result.current.maxLogsError).toBe('Invalid number');
    });
  });

  describe('clearLogs', () => {
    it('GivenLogsExist_WhenClearLogsCalled_ShouldEmptyLogsArray', () => {
      // Given - Hook 有既存的 logs
      const initialOptions = createDefaultOptions();
      const { result, rerender } = renderHook(
        (props) => useLogStream(props),
        { initialProps: initialOptions }
      );

      // 先加入一些 log
      const batchMessages: WsMessage[] = [
        { type: 'log', data: 'Log 1', containerId: 'container-123' },
        { type: 'log', data: 'Log 2', containerId: 'container-123' },
      ];
      rerender({ ...initialOptions, batchMessages });
      expect(result.current.logs).toHaveLength(2);

      // When - 呼叫 clearLogs
      act(() => {
        result.current.clearLogs();
      });

      // Then - logs 應為空陣列
      expect(result.current.logs).toEqual([]);
    });

    it('GivenEmptyLogs_WhenClearLogsCalled_ShouldRemainEmpty', () => {
      // Given - Hook 的 logs 為空
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );
      expect(result.current.logs).toEqual([]);

      // When - 呼叫 clearLogs
      act(() => {
        result.current.clearLogs();
      });

      // Then - logs 應維持空陣列
      expect(result.current.logs).toEqual([]);
    });
  });

  describe('setIsStreaming', () => {
    it('GivenIsStreamingTrue_WhenSetToFalse_ShouldUpdateState', () => {
      // Given - isStreaming 為 true
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );
      expect(result.current.isStreaming).toBe(true);

      // When - 設定為 false
      act(() => {
        result.current.setIsStreaming(false);
      });

      // Then - isStreaming 應為 false
      expect(result.current.isStreaming).toBe(false);
    });

    it('GivenIsStreamingFalse_WhenSetToTrue_ShouldUpdateState', () => {
      // Given - isStreaming 已設為 false
      const { result } = renderHook(() =>
        useLogStream(createDefaultOptions())
      );
      act(() => {
        result.current.setIsStreaming(false);
      });
      expect(result.current.isStreaming).toBe(false);

      // When - 設定為 true
      act(() => {
        result.current.setIsStreaming(true);
      });

      // Then - isStreaming 應為 true
      expect(result.current.isStreaming).toBe(true);
    });
  });

  describe('log entry 時間戳', () => {
    it('GivenBatchMessages_WhenProcessed_ShouldAddTimestampToEachEntry', () => {
      // Given - 初始化 Hook
      const initialOptions = createDefaultOptions();
      const { result, rerender } = renderHook(
        (props) => useLogStream(props),
        { initialProps: initialOptions }
      );

      // When - 收到批次訊息
      const batchMessages: WsMessage[] = [
        { type: 'log', data: 'Log with timestamp', containerId: 'container-123' },
      ];
      rerender({ ...initialOptions, batchMessages });

      // Then - 每個 log entry 應有 timestamp
      expect(result.current.logs[0].timestamp).toBeInstanceOf(Date);
    });
  });
});

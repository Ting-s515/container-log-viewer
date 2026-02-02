/**
 * useWebSocket Hook 單元測試
 *
 * 測試 WebSocket 連線管理、訊息收發、批次更新機制
 * 命名規範：Given條件_When動作_Should預期行為
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

// Mock WebSocket 類別，用於模擬瀏覽器的 WebSocket API
class MockWebSocket {
  // 靜態屬性，用於追蹤所有建立的 WebSocket 實例
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.OPEN;

  // WebSocket 事件處理器
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  // 追蹤發送的訊息，用於驗證 sendMessage 行為
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
  }

  // 測試輔助方法：模擬連線開啟
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  // 測試輔助方法：模擬收到訊息
  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  // 測試輔助方法：模擬收到原始訊息（非 JSON）
  simulateRawMessage(data: string) {
    this.onmessage?.({ data });
  }

  // 測試輔助方法：模擬連線關閉
  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  // 測試輔助方法：模擬錯誤
  simulateError(error: unknown) {
    this.onerror?.(error);
  }
}

// 將 MockWebSocket 掛載到全域，替換瀏覽器原生 WebSocket
const originalWebSocket = global.WebSocket;

describe('useWebSocket', () => {
  // 每個測試前重置狀態
  beforeEach(() => {
    // 清空 WebSocket 實例追蹤
    MockWebSocket.instances = [];
    // 替換全域 WebSocket
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    // 使用假計時器，便於控制批次更新的時序
    jest.useFakeTimers();
    // Mock console 方法，避免測試輸出雜訊
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // 每個測試後清理
  afterEach(() => {
    // 還原全域 WebSocket
    global.WebSocket = originalWebSocket;
    // 清除所有計時器
    jest.clearAllTimers();
    jest.useRealTimers();
    // 還原 console
    jest.restoreAllMocks();
  });

  describe('連線建立', () => {
    it('GivenValidPath_WhenHookMounts_ShouldCreateWebSocketConnection', () => {
      // Given - 提供有效的 WebSocket 路徑
      const path = '/ws/logs';

      // When - 渲染 Hook
      renderHook(() => useWebSocket(path));

      // Then - 應建立 WebSocket 連線，URL 包含指定路徑
      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0].url).toContain(path);
    });

    it('GivenWebSocketOpens_WhenConnectionEstablished_ShouldSetIsConnectedTrue', async () => {
      // Given - WebSocket Hook 已初始化
      const { result } = renderHook(() => useWebSocket('/ws/logs'));

      // When - WebSocket 連線成功開啟
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      // Then - isConnected 應為 true
      expect(result.current.isConnected).toBe(true);
    });

    it('GivenWebSocketFails_WhenConnectionError_ShouldRemainDisconnected', () => {
      // Given - WebSocket Hook 已初始化
      const { result } = renderHook(() => useWebSocket('/ws/logs'));

      // When - WebSocket 發生錯誤（未觸發 onopen）
      act(() => {
        MockWebSocket.instances[0].simulateError(new Error('Connection failed'));
      });

      // Then - isConnected 應維持 false
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('自動重連', () => {
    it('GivenConnectedWebSocket_WhenConnectionCloses_ShouldReconnectAfter3Seconds', () => {
      // Given - WebSocket 已連線
      renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });
      const initialInstanceCount = MockWebSocket.instances.length;

      // When - 連線關閉
      act(() => {
        MockWebSocket.instances[0].simulateClose();
      });

      // Then - 3 秒後應建立新的 WebSocket 連線
      expect(MockWebSocket.instances).toHaveLength(initialInstanceCount);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(MockWebSocket.instances).toHaveLength(initialInstanceCount + 1);
    });

    it('GivenWebSocketClosed_WhenReconnectTimerFires_ShouldAttemptNewConnection', () => {
      // Given - WebSocket 連線後斷開
      const { result } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose();
      });

      // When - 等待重連計時器觸發並模擬新連線成功
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      act(() => {
        // 對新建立的 WebSocket 實例觸發 open
        MockWebSocket.instances[1].simulateOpen();
      });

      // Then - 應重新連線成功
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('訊息接收 - 非 log 類型', () => {
    it('GivenConnectedWebSocket_WhenReceiveStartedMessage_ShouldUpdateLastMessageImmediately', () => {
      // Given - WebSocket 已連線
      const { result } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      // When - 收到 started 類型訊息
      const message = { type: 'started', containerId: 'abc123' };
      act(() => {
        MockWebSocket.instances[0].simulateMessage(message);
      });

      // Then - lastMessage 應立即更新
      expect(result.current.lastMessage).toEqual(message);
    });

    it('GivenConnectedWebSocket_WhenReceiveEndMessage_ShouldUpdateLastMessageImmediately', () => {
      // Given - WebSocket 已連線
      const { result } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      // When - 收到 end 類型訊息
      const message = { type: 'end' };
      act(() => {
        MockWebSocket.instances[0].simulateMessage(message);
      });

      // Then - lastMessage 應立即更新
      expect(result.current.lastMessage).toEqual(message);
    });

    it('GivenConnectedWebSocket_WhenReceiveErrorMessage_ShouldUpdateLastMessageImmediately', () => {
      // Given - WebSocket 已連線
      const { result } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      // When - 收到 error 類型訊息
      const message = { type: 'error', message: 'Container not found' };
      act(() => {
        MockWebSocket.instances[0].simulateMessage(message);
      });

      // Then - lastMessage 應立即更新
      expect(result.current.lastMessage).toEqual(message);
    });
  });

  describe('訊息接收 - log 類型批次處理', () => {
    it('GivenConnectedWebSocket_WhenReceiveLogMessage_ShouldNotUpdateImmediately', () => {
      // Given - WebSocket 已連線
      const { result } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      // When - 收到 log 類型訊息
      const logMessage = { type: 'log', data: 'Log line 1', containerId: 'abc123' };
      act(() => {
        MockWebSocket.instances[0].simulateMessage(logMessage);
      });

      // Then - batchMessages 應為空（尚未觸發批次更新）
      expect(result.current.batchMessages).toHaveLength(0);
    });

    it('GivenAccumulatedLogMessages_WhenBatchTimerFires_ShouldUpdateBatchMessages', () => {
      // Given - WebSocket 已連線且累積了多條 log
      const { result } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      const logs = [
        { type: 'log', data: 'Log line 1', containerId: 'abc123' },
        { type: 'log', data: 'Log line 2', containerId: 'abc123' },
        { type: 'log', data: 'Log line 3', containerId: 'abc123' },
      ];

      act(() => {
        logs.forEach(log => MockWebSocket.instances[0].simulateMessage(log));
      });

      // When - 批次計時器觸發（500ms）
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Then - batchMessages 應包含所有累積的 log
      expect(result.current.batchMessages).toHaveLength(3);
      expect(result.current.batchMessages).toEqual(logs);
    });

    it('GivenMultipleLogBatches_WhenTimerFiresMultipleTimes_ShouldUpdateEachBatch', () => {
      // Given - WebSocket 已連線
      const { result } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      // When - 第一批 log
      act(() => {
        MockWebSocket.instances[0].simulateMessage({ type: 'log', data: 'Batch 1 - Log 1' });
      });
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Then - 第一批應更新
      expect(result.current.batchMessages).toHaveLength(1);

      // When - 第二批 log
      act(() => {
        MockWebSocket.instances[0].simulateMessage({ type: 'log', data: 'Batch 2 - Log 1' });
        MockWebSocket.instances[0].simulateMessage({ type: 'log', data: 'Batch 2 - Log 2' });
      });
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Then - 第二批應覆蓋更新
      expect(result.current.batchMessages).toHaveLength(2);
    });
  });

  describe('訊息接收 - 異常處理', () => {
    it('GivenConnectedWebSocket_WhenReceiveInvalidJson_ShouldIgnoreAndLogWarning', () => {
      // Given - WebSocket 已連線
      const { result } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      // When - 收到非 JSON 格式訊息
      act(() => {
        MockWebSocket.instances[0].simulateRawMessage('not a json string');
      });

      // Then - 應忽略訊息並輸出警告，狀態不變
      expect(console.warn).toHaveBeenCalledWith('Invalid WebSocket message:', 'not a json string');
      expect(result.current.lastMessage).toBeNull();
      expect(result.current.batchMessages).toHaveLength(0);
    });
  });

  describe('sendMessage', () => {
    it('GivenConnectedWebSocket_WhenSendMessage_ShouldSendJsonMessage', () => {
      // Given - WebSocket 已連線
      const { result } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      // When - 發送訊息
      const message = { type: 'start', containerId: 'abc123', filter: 'error' };
      act(() => {
        result.current.sendMessage(message);
      });

      // Then - WebSocket 應收到 JSON 格式訊息
      expect(MockWebSocket.instances[0].sentMessages).toHaveLength(1);
      expect(MockWebSocket.instances[0].sentMessages[0]).toBe(JSON.stringify(message));
    });

    it('GivenDisconnectedWebSocket_WhenSendMessage_ShouldLogWarningAndNotSend', () => {
      // Given - WebSocket 未連線（readyState 不是 OPEN）
      const { result } = renderHook(() => useWebSocket('/ws/logs'));
      // 不觸發 simulateOpen，保持未連線狀態
      MockWebSocket.instances[0].readyState = MockWebSocket.CLOSED;

      // When - 嘗試發送訊息
      act(() => {
        result.current.sendMessage({ type: 'start' });
      });

      // Then - 應輸出警告，不發送訊息
      expect(console.warn).toHaveBeenCalledWith('WebSocket is not connected');
      expect(MockWebSocket.instances[0].sentMessages).toHaveLength(0);
    });
  });

  describe('clearBuffer', () => {
    it('GivenPendingLogMessages_WhenClearBuffer_ShouldClearAllPendingMessages', () => {
      // Given - 有累積中的 log 訊息
      const { result } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({ type: 'log', data: 'Pending log 1' });
        MockWebSocket.instances[0].simulateMessage({ type: 'log', data: 'Pending log 2' });
      });

      // When - 呼叫 clearBuffer
      act(() => {
        result.current.clearBuffer();
      });

      // Then - 即使計時器觸發，batchMessages 也應為空
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current.batchMessages).toHaveLength(0);
    });

    it('GivenExistingBatchMessages_WhenClearBuffer_ShouldClearBatchMessages', () => {
      // Given - 已有批次訊息
      const { result } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({ type: 'log', data: 'Log 1' });
      });
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current.batchMessages).toHaveLength(1);

      // When - 呼叫 clearBuffer
      act(() => {
        result.current.clearBuffer();
      });

      // Then - batchMessages 應被清空
      expect(result.current.batchMessages).toHaveLength(0);
    });

    it('GivenActiveBatchTimer_WhenClearBuffer_ShouldCancelTimer', () => {
      // Given - 有進行中的批次計時器
      const { result } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({ type: 'log', data: 'Log 1' });
      });

      // When - 呼叫 clearBuffer 後再新增 log
      act(() => {
        result.current.clearBuffer();
      });
      act(() => {
        MockWebSocket.instances[0].simulateMessage({ type: 'log', data: 'New log after clear' });
      });

      // Then - 只有新的 log 會在下一個批次出現
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current.batchMessages).toHaveLength(1);
      expect(result.current.batchMessages[0].data).toBe('New log after clear');
    });
  });

  describe('元件卸載清理', () => {
    it('GivenMountedHook_WhenUnmount_ShouldCloseWebSocketConnection', () => {
      // Given - Hook 已掛載且連線
      const { unmount } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });
      const ws = MockWebSocket.instances[0];

      // When - 卸載元件
      unmount();

      // Then - WebSocket 應被關閉
      expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    });

    it('GivenPendingReconnectTimer_WhenUnmount_ShouldClearReconnectTimer', () => {
      // Given - 連線斷開後有待處理的重連計時器
      const { unmount } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose();
      });
      const instanceCountBeforeUnmount = MockWebSocket.instances.length;

      // When - 卸載元件
      unmount();

      // Then - 重連計時器應被取消，不會建立新連線
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(MockWebSocket.instances).toHaveLength(instanceCountBeforeUnmount);
    });

    it('GivenPendingBatchTimer_WhenUnmount_ShouldClearBatchTimer', () => {
      // Given - 有待處理的批次計時器
      const { result, unmount } = renderHook(() => useWebSocket('/ws/logs'));
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({ type: 'log', data: 'Pending log' });
      });

      // When - 卸載元件
      unmount();

      // Then - 批次計時器應被取消（不會因計時器觸發而報錯）
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(500);
        });
      }).not.toThrow();
    });
  });
});

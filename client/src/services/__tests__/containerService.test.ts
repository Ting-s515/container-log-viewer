/**
 * containerService 單元測試
 *
 * 測試範圍：容器 API 服務層的 HTTP 呼叫行為
 * 命名規範：Given條件_When動作_Should預期行為
 */

import { containerService } from '../containerService';

describe('containerService', () => {
  // 保存原始 fetch 以便測試後還原
  const originalFetch = global.fetch;

  // 每個測試前重置 fetch mock
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  // 測試後還原原始 fetch
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('getContainers', () => {
    it('GivenApiResponseSuccess_WhenGetContainers_ShouldReturnContainerArray', async () => {
      // Given - API 回應成功且有容器資料
      const mockContainers = [
        { id: 'abc123', name: 'container1', state: 'running' },
        { id: 'def456', name: 'container2', state: 'stopped' },
      ];
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: mockContainers }),
      });

      // When - 呼叫 getContainers
      const result = await containerService.getContainers();

      // Then - 應返回容器陣列
      expect(result).toEqual(mockContainers);
      expect(global.fetch).toHaveBeenCalledWith('/api/containers');
    });

    it('GivenApiResponseSuccessFalse_WhenGetContainers_ShouldReturnEmptyArray', async () => {
      // Given - API 回應 success 為 false
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ success: false, error: 'Some error' }),
      });

      // When - 呼叫 getContainers
      const result = await containerService.getContainers();

      // Then - 應返回空陣列
      expect(result).toEqual([]);
    });

    it('GivenFetchThrowsError_WhenGetContainers_ShouldReturnEmptyArrayAndLogError', async () => {
      // Given - fetch 發生網路錯誤
      const mockError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(mockError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // When - 呼叫 getContainers
      const result = await containerService.getContainers();

      // Then - 應返回空陣列並記錄錯誤
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch containers:',
        mockError
      );
    });
  });

  describe('getRuntime', () => {
    it('GivenApiResponseSuccess_WhenGetRuntime_ShouldReturnRuntimeName', async () => {
      // Given - API 回應成功且有 runtime 資料
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { runtime: 'docker' } }),
      });

      // When - 呼叫 getRuntime
      const result = await containerService.getRuntime();

      // Then - 應返回 runtime 名稱
      expect(result).toBe('docker');
      expect(global.fetch).toHaveBeenCalledWith('/api/containers/runtime');
    });

    it('GivenApiResponseSuccessButRuntimeEmpty_WhenGetRuntime_ShouldReturnUnknown', async () => {
      // Given - API 回應成功但 runtime 為空字串
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { runtime: '' } }),
      });

      // When - 呼叫 getRuntime
      const result = await containerService.getRuntime();

      // Then - 應返回 'unknown'（因為空字串為 falsy，走 || 'unknown' 邏輯）
      expect(result).toBe('unknown');
    });

    it('GivenApiResponseSuccessFalse_WhenGetRuntime_ShouldReturnEmptyString', async () => {
      // Given - API 回應 success 為 false
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ success: false, error: 'Runtime not found' }),
      });

      // When - 呼叫 getRuntime
      const result = await containerService.getRuntime();

      // Then - 應返回空字串
      expect(result).toBe('');
    });

    it('GivenFetchThrowsError_WhenGetRuntime_ShouldReturnEmptyStringAndLogError', async () => {
      // Given - fetch 發生網路錯誤
      const mockError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(mockError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // When - 呼叫 getRuntime
      const result = await containerService.getRuntime();

      // Then - 應返回空字串並記錄錯誤
      expect(result).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch runtime:',
        mockError
      );
    });
  });
});

/**
 * useContainers Hook 單元測試
 *
 * 測試容器列表與執行環境狀態的管理
 * 命名規範：Given條件_When動作_Should預期行為
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useContainers } from '../useContainers';
import { containerService } from '../../services/containerService';
import type { Container } from '../../types';

// Mock containerService 模組，用於模擬 API 呼叫
jest.mock('../../services/containerService');

// 取得 mock 後的 containerService，便於設定回傳值
const mockContainerService = containerService as jest.Mocked<typeof containerService>;

describe('useContainers', () => {
  // 每個測試前重置 mock 狀態
  beforeEach(() => {
    jest.clearAllMocks();
    // 預設設定：API 回傳空資料（避免 pending promise 導致測試 hang）
    mockContainerService.getContainers.mockResolvedValue([]);
    mockContainerService.getRuntime.mockResolvedValue('');
  });

  describe('初始狀態', () => {
    it('GivenHookMounts_WhenInitialized_ShouldHaveEmptyContainersArray', async () => {
      // Given & When - Hook 初始化
      const { result } = renderHook(() => useContainers());

      // Then - containers 初始應為空陣列
      expect(result.current.containers).toEqual([]);

      // 等待非同步更新完成，避免 act 警告
      await waitFor(() => {
        expect(mockContainerService.getContainers).toHaveBeenCalled();
      });
    });

    it('GivenHookMounts_WhenInitialized_ShouldHaveEmptyRuntimeString', async () => {
      // Given & When - Hook 初始化
      const { result } = renderHook(() => useContainers());

      // Then - runtime 初始應為空字串
      expect(result.current.runtime).toBe('');

      // 等待非同步更新完成，避免 act 警告
      await waitFor(() => {
        expect(mockContainerService.getRuntime).toHaveBeenCalled();
      });
    });
  });

  describe('API 呼叫', () => {
    it('GivenHookMounts_WhenInitialized_ShouldCallGetContainersApi', async () => {
      // Given - Mock API
      mockContainerService.getContainers.mockResolvedValue([]);

      // When - Hook 初始化
      renderHook(() => useContainers());

      // Then - 應呼叫 getContainers API
      await waitFor(() => {
        expect(mockContainerService.getContainers).toHaveBeenCalledTimes(1);
      });
    });

    it('GivenHookMounts_WhenInitialized_ShouldCallGetRuntimeApi', async () => {
      // Given - Mock API
      mockContainerService.getRuntime.mockResolvedValue('docker');

      // When - Hook 初始化
      renderHook(() => useContainers());

      // Then - 應呼叫 getRuntime API
      await waitFor(() => {
        expect(mockContainerService.getRuntime).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('狀態更新', () => {
    it('GivenApiReturnsContainers_WhenDataLoaded_ShouldUpdateContainersState', async () => {
      // Given - API 回傳容器列表
      const mockContainers: Container[] = [
        { id: 'abc123', name: 'web-server', status: 'running' },
        { id: 'def456', name: 'database', status: 'running' },
      ];
      mockContainerService.getContainers.mockResolvedValue(mockContainers);

      // When - Hook 初始化並等待 API 回傳
      const { result } = renderHook(() => useContainers());

      // Then - containers 應更新為 API 回傳的資料
      await waitFor(() => {
        expect(result.current.containers).toEqual(mockContainers);
      });
    });

    it('GivenApiReturnsRuntime_WhenDataLoaded_ShouldUpdateRuntimeState', async () => {
      // Given - API 回傳執行環境
      mockContainerService.getRuntime.mockResolvedValue('docker');

      // When - Hook 初始化並等待 API 回傳
      const { result } = renderHook(() => useContainers());

      // Then - runtime 應更新為 API 回傳的資料
      await waitFor(() => {
        expect(result.current.runtime).toBe('docker');
      });
    });

    it('GivenApiReturnsPodman_WhenDataLoaded_ShouldUpdateRuntimeToPodman', async () => {
      // Given - API 回傳 podman 作為執行環境
      mockContainerService.getRuntime.mockResolvedValue('podman');

      // When - Hook 初始化並等待 API 回傳
      const { result } = renderHook(() => useContainers());

      // Then - runtime 應更新為 podman
      await waitFor(() => {
        expect(result.current.runtime).toBe('podman');
      });
    });

    it('GivenApiReturnsEmptyContainers_WhenDataLoaded_ShouldKeepEmptyArray', async () => {
      // Given - API 回傳空容器列表
      mockContainerService.getContainers.mockResolvedValue([]);

      // When - Hook 初始化並等待 API 回傳
      const { result } = renderHook(() => useContainers());

      // Then - containers 應維持空陣列
      await waitFor(() => {
        expect(result.current.containers).toEqual([]);
      });
    });
  });

  describe('並行載入', () => {
    it('GivenBothApisSucceed_WhenDataLoaded_ShouldUpdateBothStates', async () => {
      // Given - 兩個 API 都回傳資料
      const mockContainers: Container[] = [
        { id: 'abc123', name: 'nginx', status: 'running' },
      ];
      mockContainerService.getContainers.mockResolvedValue(mockContainers);
      mockContainerService.getRuntime.mockResolvedValue('docker');

      // When - Hook 初始化
      const { result } = renderHook(() => useContainers());

      // Then - 兩個狀態都應更新
      await waitFor(() => {
        expect(result.current.containers).toEqual(mockContainers);
        expect(result.current.runtime).toBe('docker');
      });
    });
  });
});

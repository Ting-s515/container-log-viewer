/**
 * useContainers Hook
 * 管理容器列表與執行環境狀態
 * 負責初始載入與狀態維護，將 API 呼叫邏輯從 App.tsx 抽離
 */

import { useState, useEffect } from 'react';
import type { Container } from '../types';
import { containerService } from '../services/containerService';

/**
 * Hook 回傳值型別
 */
interface UseContainersResult {
  containers: Container[];  // 容器列表
  runtime: string;          // 執行環境（docker / podman）
}

/**
 * 容器列表與執行環境管理 Hook
 * @returns 容器列表與執行環境狀態
 */
export function useContainers(): UseContainersResult {
  // 容器列表狀態
  const [containers, setContainers] = useState<Container[]>([]);
  // 執行環境狀態（docker / podman）
  const [runtime, setRuntime] = useState<string>('');

  // 初始載入：同時取得容器列表與執行環境
  useEffect(() => {
    // 載入容器列表
    containerService.getContainers().then(setContainers);
    // 載入執行環境資訊
    containerService.getRuntime().then(setRuntime);
  }, []);

  return { containers, runtime };
}

/**
 * 容器 API 服務層
 * 封裝所有容器相關的 HTTP API 呼叫，統一錯誤處理與資料轉換
 */

import type { Container } from '../types';

/**
 * 容器服務物件
 * 提供容器列表與執行環境的 API 呼叫方法
 */
export const containerService = {
  /**
   * 取得所有容器列表
   * @returns Promise<Container[]> 容器陣列，失敗時回傳空陣列
   */
  getContainers: async (): Promise<Container[]> => {
    try {
      const res = await fetch('/api/containers');
      const json = await res.json();

      // 檢查 API 回應是否成功
      if (json.success) {
        return json.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch containers:', error);
      return [];
    }
  },

  /**
   * 取得執行環境（docker 或 podman）
   * @returns Promise<string> 執行環境名稱，失敗時回傳空字串
   */
  getRuntime: async (): Promise<string> => {
    try {
      const res = await fetch('/api/containers/runtime');
      const json = await res.json();

      // 檢查 API 回應是否成功
      if (json.success) {
        return json.data.runtime || 'unknown';
      }
      return '';
    } catch (error) {
      console.error('Failed to fetch runtime:', error);
      return '';
    }
  },
};

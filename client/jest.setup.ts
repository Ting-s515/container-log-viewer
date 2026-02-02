/**
 * Jest 測試環境設定檔
 *
 * 在每個測試檔案執行前載入，用於：
 * 1. 擴充 Jest 斷言（@testing-library/jest-dom）
 * 2. 設定全域 Mock（如 WebSocket）
 */

import '@testing-library/jest-dom';

// Mock ResizeObserver - Headless UI 等現代 UI 庫需要此 API
// jsdom 環境不支援 ResizeObserver，需手動提供 mock 實作
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

// 確保全域有 WebSocket 常數可供測試使用
// jsdom 環境已內建 WebSocket，但為了測試穩定性，確保常數存在
if (typeof WebSocket !== 'undefined') {
  // WebSocket readyState 常數
  Object.defineProperty(WebSocket, 'CONNECTING', { value: 0 });
  Object.defineProperty(WebSocket, 'OPEN', { value: 1 });
  Object.defineProperty(WebSocket, 'CLOSING', { value: 2 });
  Object.defineProperty(WebSocket, 'CLOSED', { value: 3 });
}

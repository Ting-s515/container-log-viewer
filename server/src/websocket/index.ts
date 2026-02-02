import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { streamContainerLogs } from '../services/container.js';
import type { ChildProcess } from 'child_process';

// 追蹤每個 WebSocket 連線對應的 log 串流程序
const activeStreams = new Map<WebSocket, ChildProcess>();

/**
 * 設定 WebSocket Server
 * 客戶端連線後發送 { containerId, filter? } 開始串流
 */
export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/ws/logs' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('📡 WebSocket client connected');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // 處理開始串流請求
        if (message.type === 'start' && message.containerId) {
          // 先清除舊的串流（如果有）
          stopStream(ws);

          const { process, filter } = await streamContainerLogs(
            message.containerId,
            {
              filter: message.filter,
              since: message.since,
              tail: message.tail || 100,
            }
          );

          activeStreams.set(ws, process);

          // 處理 stdout 串流
          // 傳入 containerId 讓前端可以判斷日誌來源，避免切換容器時的競態條件
          process.stdout?.on('data', (chunk: Buffer) => {
            const lines = chunk.toString();
            sendFilteredLogs(ws, lines, message.containerId, filter);
          });

          // 處理 stderr 串流（Docker logs 可能輸出到 stderr）
          // 同樣傳入 containerId
          process.stderr?.on('data', (chunk: Buffer) => {
            const lines = chunk.toString();
            sendFilteredLogs(ws, lines, message.containerId, filter);
          });

          // 程序結束時通知客戶端
          process.on('close', (code) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'end',
                message: `Log stream ended with code ${code}`,
              }));
            }
            activeStreams.delete(ws);
          });

          // 程序錯誤處理
          process.on('error', (err) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'error',
                message: err.message,
              }));
            }
          });

          // 確認開始串流
          ws.send(JSON.stringify({
            type: 'started',
            containerId: message.containerId,
          }));
        }

        // 處理停止串流請求
        if (message.type === 'stop') {
          stopStream(ws);
          ws.send(JSON.stringify({ type: 'stopped' }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知錯誤';
        ws.send(JSON.stringify({ type: 'error', message: errorMessage }));
      }
    });

    // 連線關閉時清理資源
    ws.on('close', () => {
      console.log('📡 WebSocket client disconnected');
      stopStream(ws);
    });

    // 錯誤處理
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      stopStream(ws);
    });
  });

  console.log('✅ WebSocket server initialized');
}

/**
 * 發送過濾後的 log 到客戶端
 * @param containerId - 容器 ID，讓前端可以判斷日誌是否屬於當前選擇的容器
 */
function sendFilteredLogs(ws: WebSocket, logs: string, containerId: string, filter?: string) {
  if (ws.readyState !== WebSocket.OPEN) return;

  let lines = logs;

  // 即時關鍵字過濾
  if (filter) {
    const filterLower = filter.toLowerCase();
    lines = logs
      .split('\n')
      .filter((line) => line.toLowerCase().includes(filterLower))
      .join('\n');

    // 如果過濾後沒有內容，不發送
    if (!lines.trim()) return;
  }

  // 包含 containerId，讓前端可以過濾不屬於當前容器的日誌
  ws.send(JSON.stringify({ type: 'log', data: lines, containerId }));
}

/**
 * 停止指定 WebSocket 連線的 log 串流
 */
function stopStream(ws: WebSocket) {
  const process = activeStreams.get(ws);
  if (process) {
    process.kill();
    activeStreams.delete(ws);
  }
}

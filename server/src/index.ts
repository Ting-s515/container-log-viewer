import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { setupWebSocket } from './websocket/index.js';
import containerRoutes from './routes/containers.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 中間件設定
app.use(cors());
app.use(express.json());

// API 路由
app.use('/api/containers', containerRoutes);

// 健康檢查端點
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 建立 HTTP server 以便共用 WebSocket
const server = createServer(app);

// 設定 WebSocket
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket available on ws://localhost:${PORT}/ws/logs`);
});

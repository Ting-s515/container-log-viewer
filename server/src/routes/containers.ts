import { Router, Request, Response } from 'express';
import { listContainers, getContainerLogs, detectContainerRuntime } from '../services/container.js';

const router = Router();

/**
 * GET /api/containers
 * 列出所有容器
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const containers = await listContainers();
    res.json({ success: true, data: containers });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/containers/runtime
 * 取得目前使用的容器執行工具
 */
router.get('/runtime', async (_req: Request, res: Response) => {
  try {
    const runtime = await detectContainerRuntime();
    res.json({ success: true, data: { runtime } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/containers/:id/logs
 * 取得指定容器的歷史 log
 * Query params: since, until, filter, tail
 */
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { since, until, filter, tail } = req.query;

    const logs = await getContainerLogs(id, {
      since: since as string,
      until: until as string,
      filter: filter as string,
      tail: tail ? parseInt(tail as string, 10) : undefined,
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;

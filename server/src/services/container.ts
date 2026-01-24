import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 容器資訊介面
export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
}

// Log 查詢參數介面
export interface LogOptions {
  since?: string;    // ISO 時間字串，例如 "2024-01-01T00:00:00"
  until?: string;    // ISO 時間字串
  filter?: string;   // 關鍵字過濾
  tail?: number;     // 最後 N 行
}

/**
 * 偵測系統可用的容器執行工具
 * 優先順序：docker > podman
 */
export async function detectContainerRuntime(): Promise<'docker' | 'podman' | null> {
  try {
    await execAsync('docker --version');
    return 'docker';
  } catch {
    try {
      await execAsync('podman --version');
      return 'podman';
    } catch {
      return null;
    }
  }
}

/**
 * 取得所有容器列表（包含運行中與停止的）
 */
export async function listContainers(): Promise<Container[]> {
  const runtime = await detectContainerRuntime();
  if (!runtime) {
    throw new Error('未偵測到 Docker 或 Podman，請確認已安裝');
  }

  // 使用 JSON 格式輸出，方便解析
  const { stdout } = await execAsync(
    `${runtime} ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}"`
  );

  if (!stdout.trim()) {
    return [];
  }

  return stdout
    .trim()
    .split('\n')
    .map((line) => {
      const [id, name, image, status, state] = line.split('|');
      return { id, name, image, status, state };
    });
}

/**
 * 取得指定容器的歷史 log
 */
export async function getContainerLogs(
  containerId: string,
  options: LogOptions = {}
): Promise<string> {
  const runtime = await detectContainerRuntime();
  if (!runtime) {
    throw new Error('未偵測到 Docker 或 Podman');
  }

  // 組裝 CLI 參數
  const args: string[] = ['logs'];

  if (options.since) {
    args.push('--since', options.since);
  }
  if (options.until) {
    args.push('--until', options.until);
  }
  if (options.tail) {
    args.push('--tail', String(options.tail));
  }

  args.push(containerId);

  const { stdout, stderr } = await execAsync(`${runtime} ${args.join(' ')}`);

  let logs = stdout + stderr; // Docker logs 可能輸出到 stderr

  // 關鍵字過濾（後端處理）
  if (options.filter) {
    const filterLower = options.filter.toLowerCase();
    logs = logs
      .split('\n')
      .filter((line) => line.toLowerCase().includes(filterLower))
      .join('\n');
  }

  return logs;
}

/**
 * 建立即時 log 串流（用於 WebSocket）
 * 回傳 ChildProcess，呼叫端可監聽 stdout/stderr
 */
export async function streamContainerLogs(
  containerId: string,
  options: LogOptions = {}
) {
  const runtime = await detectContainerRuntime();
  if (!runtime) {
    throw new Error('未偵測到 Docker 或 Podman');
  }

  const args: string[] = ['logs', '-f', '--tail', String(options.tail || 100)];

  if (options.since) {
    args.push('--since', options.since);
  }

  args.push(containerId);

  // 使用 spawn 建立串流，不等待結束
  const process = spawn(runtime, args);

  return {
    process,
    filter: options.filter, // 傳遞 filter 讓呼叫端處理即時過濾
  };
}

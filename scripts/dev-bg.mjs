#!/usr/bin/env node
/**
 * 后台启动开发栈（Windows 友好）。
 *
 *   npm run dev:bg
 *
 * 按端口杀掉旧的 next dev（默认 3000，可用 PORT 覆盖），再用 detached 方式重拉，
 * 日志写 logs/dev.out.log，最后等端口就绪。前台 `npm run dev` 仍然可用。
 */
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_DIR = path.join(projectRoot, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'dev.out.log');
const PORT = Number(process.env.PORT || 3000);

function pidsOnPort(port) {
  if (process.platform !== 'win32') {
    try {
      const out = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf-8' }).trim();
      return out ? out.split(/\s+/).map(Number) : [];
    } catch {
      return [];
    }
  }
  try {
    const out = execSync(`netstat -ano -p tcp | findstr LISTENING | findstr :${port}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return [...new Set(out.split(/\r?\n/).map((l) => l.trim().split(/\s+/).pop()).filter((x) => x && x !== '0').map(Number))];
  } catch {
    return [];
  }
}

function killTree(pid) {
  try {
    if (process.platform === 'win32') execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    else execSync(`kill -TERM -${pid} || kill -TERM ${pid}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function canConnect(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(300);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    const no = () => {
      socket.destroy();
      resolve(false);
    };
    socket.once('error', no);
    socket.once('timeout', no);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(LOG_DIR, { recursive: true });

  for (const pid of pidsOnPort(PORT)) {
    console.log(`[dev:bg] ${killTree(pid) ? '已停止' : '停止失败'} PID ${pid}（端口 ${PORT}）`);
  }
  for (let i = 0; i < 20; i += 1) {
    if (!(await canConnect(PORT))) break;
    await sleep(250);
  }

  // 清掉宿主泄漏的 Next 私有变量（详见 scripts/next.mjs 顶部说明）
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith('__NEXT_PRIVATE_')) delete env[key];
  }

  const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const logFd = fs.openSync(LOG_FILE, 'w');
  const child = spawn(process.execPath, [nextBin, 'dev', '--port', String(PORT)], {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    windowsHide: true,
    env,
  });
  child.unref();
  fs.closeSync(logFd);
  console.log(`[dev:bg] 已在后台启动 next dev（PID ${child.pid}，端口 ${PORT}，日志 ${path.relative(projectRoot, LOG_FILE)}）`);

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await canConnect(PORT)) {
      console.log(`[dev:bg] 就绪：http://localhost:${PORT}`);
      return;
    }
    await sleep(400);
  }
  console.error('[dev:bg] 端口未就绪，日志尾部：');
  try {
    console.error(fs.readFileSync(LOG_FILE, 'utf-8').split(/\r?\n/).slice(-25).join('\n'));
  } catch {
    /* ignore */
  }
  process.exitCode = 1;
}

main().catch((e) => {
  console.error(`[dev:bg] 失败：${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});

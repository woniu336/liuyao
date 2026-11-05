#!/usr/bin/env node
/**
 * Next 启动器：清掉宿主进程泄漏进来的 Next 私有环境变量，再原样转发参数。
 *
 * 背景：`__NEXT_PRIVATE_STANDALONE_CONFIG` 只有 Next 自己的 standalone server 才该设置。
 * 若从宿主的 Electron / 打包应用继承到本项目的 `next dev` / `next build`，
 * 会被当成真实配置读入（distDir 被改成别的目录、outputFileTracingRoot 指到不存在的路径），
 * 表现为 dev 起不来、或 build 直接 `TypeError: generate is not a function`。
 *
 *   node scripts/next.mjs dev
 *   node scripts/next.mjs build
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { loadLocalSecrets } from './load-secrets.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadLocalSecrets(projectRoot);
const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (key.startsWith('__NEXT_PRIVATE_')) delete env[key];
}

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
  windowsHide: true,
});

child.once('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
child.once('error', (err) => {
  console.error(`[next] 启动失败：${err.message}`);
  process.exit(1);
});

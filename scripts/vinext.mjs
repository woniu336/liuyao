#!/usr/bin/env node
/**
 * vinext/vite 启动器（Node 侧）。
 *
 * 做两件事：
 *   1. 读取本地密钥文件 `.llm.local`（gitignore），补齐 process.env；
 *      vinext 的 cloudflare.config.ts 在 Node 侧执行，会把这里的变量映射成文本绑定，
 *      nodejs_compat 再映射到 workerd 的 process.env。
 *   2. 清掉宿主泄漏的 `__NEXT_PRIVATE_*`（否则 dev/build 会被当成 standalone 配置）。
 *
 *   node scripts/vinext.mjs dev --port 3001 --strictPort
 *   node scripts/vinext.mjs build
 *   node scripts/vinext.mjs preview --port 4173
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { loadLocalSecrets } from './load-secrets.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

loadLocalSecrets(projectRoot);

const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (key.startsWith('__NEXT_PRIVATE_')) delete env[key];
}

const args = process.argv.slice(2);
const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const child = spawn(process.execPath, [viteBin, ...args], {
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
  console.error(`[vinext] 启动失败：${err.message}`);
  process.exit(1);
});

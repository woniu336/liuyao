#!/usr/bin/env node
/**
 * Cloudflare 可移植性守卫
 * ========================
 * 目标：让「以后能部署到 Workers」这件事不靠记忆，而靠一条命令拦住破坏它的改动。
 *
 *   npm run check:portability
 *
 * 扫描运行时代码（app / components / lib），禁止：
 *   1. node 内置模块（fs / path / os / node:*）—— Workers 没有文件系统与常驻进程；
 *   2. next/image、next/font —— 图片与字体的构建期优化在 Workers 上没有完整实现；
 *   3. next.config 里的 output: 'export' —— 一旦锁成纯静态，route handler 就没法加；
 *   4. 客户端组件里直接读 process.env（只允许 NEXT_PUBLIC_*）。
 *
 * 允许的例外（构建期文件，不会进 Worker 运行时）：
 *   - lib/dev/dev-origins.ts（只被 next.config.ts 引用）
 *   - app/api/**（服务端 route handler，按 Worker 能力写，但此处仍扫 node 内置）
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['app', 'components', 'lib'];
const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.mjs']);
const ALLOW_FILES = new Set(['lib/dev/dev-origins.ts']);

const NODE_IMPORT = /(?:from\s*['"]node:|require\(\s*['"]node:|from\s*['"](?:fs|path|os|crypto|child_process|http|https|stream|util|zlib|url)['"])/;
const NEXT_IMAGE = /from\s*['"]next\/image['"]/;
const NEXT_FONT = /from\s*['"]next\/font/;
const CLIENT_ENV = /process\.env\.(?!NEXT_PUBLIC_)[A-Za-z_]/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, out);
    } else if (SCAN_EXT.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

const issues = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(path.join(root, dir))) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    if (ALLOW_FILES.has(rel)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const isClient = /^\s*['"]use client['"]/m.test(text);

    text.split(/\r?\n/).forEach((line, i) => {
      const where = `${rel}:${i + 1}`;
      if (NODE_IMPORT.test(line)) issues.push(`${where}  node 内置模块（Workers 无 fs/进程）：${line.trim()}`);
      if (NEXT_IMAGE.test(line)) issues.push(`${where}  next/image（Workers 无完整构建期图片管线）`);
      if (NEXT_FONT.test(line)) issues.push(`${where}  next/font（Workers 无完整构建期字体管线）`);
      if (isClient && CLIENT_ENV.test(line)) {
        issues.push(`${where}  客户端组件读取服务端 env（只允许 NEXT_PUBLIC_*）：${line.trim()}`);
      }
    });
  }
}

// next.config 不得锁死成纯静态导出
const configPath = path.join(root, 'next.config.ts');
if (fs.existsSync(configPath)) {
  const cfg = fs.readFileSync(configPath, 'utf8');
  if (/output\s*:\s*['"]export['"]/.test(cfg)) {
    issues.push(`next.config.ts  output: 'export' —— 会阻止后续添加 route handler（D1/LLM 代理）`);
  }
}

if (issues.length) {
  console.error(`\n[check:portability] 发现 ${issues.length} 处可能阻断 Cloudflare 部署的写法：\n`);
  for (const line of issues) console.error('  ✗ ' + line);
  console.error('\n说明见 docs/cloudflare.md。');
  process.exit(1);
}

console.log('[check:portability] OK：运行时代码未发现 Workers 不兼容写法。');

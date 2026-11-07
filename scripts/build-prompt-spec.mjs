#!/usr/bin/env node
/**
 * 把完整断卦规范（docs/prompt-liuyao.md）内联成 TS 模块，供服务端运行时整份注入。
 *
 *   node scripts/build-prompt-spec.mjs          # 生成
 *   node scripts/build-prompt-spec.mjs --check  # 只校验是否最新（CI 用）
 *
 * 为什么内联：Workers 运行时没有 fs，读不到仓库里的 md；而规范必须"原版整份"发给模型
 * （用户明确要求专项不精简），所以构建期把它变成常量。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'docs', 'prompt-liuyao.md');
const out = path.join(root, 'lib', 'readings', 'prompt-spec.generated.ts');

const text = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
const body = `/* 由 scripts/build-prompt-spec.mjs 生成，请勿手改。
 * 事实源：docs/prompt-liuyao.md
 */

/** 完整断卦规范（原版，未精简）；${text.length} 字 */
export const PROMPT_SPEC = ${JSON.stringify(text)};
`;

if (process.argv.includes('--check')) {
  const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (cur !== body) {
    console.error('[check:prompt] lib/readings/prompt-spec.generated.ts 与 docs/prompt-liuyao.md 不一致，请运行 npm run gen:prompt');
    process.exit(1);
  }
  console.log(`[check:prompt] OK（${text.length} 字，与规范一致）`);
} else {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body, 'utf8');
  console.log(`[gen:prompt] 写入 ${path.relative(root, out)}（${text.length} 字）`);
}

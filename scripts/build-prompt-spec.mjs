#!/usr/bin/env node
/**
 * 把完整断卦规范（docs/prompt-liuyao.md）内联成 TS 模块。
 *
 *   node scripts/build-prompt-spec.mjs          # 生成
 *   node scripts/build-prompt-spec.mjs --check  # 只校验是否最新（CI 用）
 *
 * 为什么内联：Workers 没有 fs，读不到仓库里的 md。
 * 为什么拆章：整份 5.4 万字（≈36k token）每次全发，网关满载时容易被拒（429/prefill_cap_refused），
 * 且首字要 9–10 秒。拆成"章 + 输出清单"后可按问句只发「核心章 + 命中的专项章」，
 * **内容一字不改**（整章原样搬运），只是发送策略变化。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'docs', 'prompt-liuyao.md');
const out = path.join(root, 'lib', 'readings', 'prompt-spec.generated.ts');

const text = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');

// ---- 按 `# 零、…` 这种一级标题切章 ----
const heads = [...text.matchAll(/^# ([零一二三四五六七八九十]+)、(.+)$/gm)];
const chapters = {};
for (let i = 0; i < heads.length; i += 1) {
  const start = heads[i].index;
  const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
  chapters[heads[i][1]] = text.slice(start, end).trimEnd();
}
const preface = text.slice(0, heads[0]?.index ?? 0).trimEnd();

// ---- 把「输出格式」章再拆成 头部 + A~J（章号随文档顺延，动态识别） ----
const outputChapterId = Object.entries(chapters).find(([, v]) => v.includes('## A. 通用人事占'))?.[0] ?? '';
const ch17 = chapters[outputChapterId] ?? '';
const fmtHeads = [...ch17.matchAll(/^## ([A-J])\. (.+)$/gm)];
const outputHead = fmtHeads.length ? ch17.slice(0, fmtHeads[0].index).trimEnd() : ch17;
const formats = {};
for (let i = 0; i < fmtHeads.length; i += 1) {
  const start = fmtHeads[i].index;
  const end = i + 1 < fmtHeads.length ? fmtHeads[i + 1].index : ch17.length;
  formats[fmtHeads[i][1]] = ch17.slice(start, end).trimEnd();
}

const q = (s) => JSON.stringify(s);
const body = `/* 由 scripts/build-prompt-spec.mjs 生成，请勿手改。
 * 事实源：docs/prompt-liuyao.md（整章原样搬运，未做任何改写）
 */

/** 完整规范（原版全文，${text.length} 字）：给"详版/外部 Agent"投放用 */
export const PROMPT_SPEC = ${q(text)};

/** 前言（版本与投放说明，运行时不发） */
export const SPEC_PREFACE = ${q(preface)};

/** 按章切开（零 / 一 / … / 二十二），内容与原文逐字一致 */
export const SPEC_CHAPTERS: Record<string, string> = {
${Object.entries(chapters).map(([k, v]) => `  ${q(k)}: ${q(v)},`).join('\n')}
};

/** §十七 的头部（四层输出 + 四段模板与字数预算） */
export const OUTPUT_HEAD = ${q(outputHead)};

/** §十七 里的 A~I 输出清单（按专项取用） */
export const OUTPUT_FORMATS: Record<string, string> = {
${Object.entries(formats).map(([k, v]) => `  ${q(k)}: ${q(v)},`).join('\n')}
};

/** 「输出格式」所在章号（运行时用它的头部 + 选中清单替换整章） */
export const OUTPUT_CHAPTER_ID = ${q(Object.entries(chapters).find(([, v]) => v.includes('## A. 通用人事占'))?.[0] ?? '')};

/** 核心章列表（仅文档完整性校验用；运行时发全量） */
export const CORE_CHAPTER_IDS = ${q(['零', '一', '二', '三', '四', '五', '六', '十六', '十七', '十八', '十九', '二十', '二十一'])};

/** 专项 → 输出清单的对应表（文档完整性校验用；运行时已改为全量发送，不再选章） */
export const CHAPTER_FORMAT_MAP: Record<string, string> = ${q({ 七: 'B', 八: 'C', 九: 'D', 十: 'E', 十一: 'F', 十二: 'G', 十三: 'H', 十四: 'I', 十五: 'J' })};
`;

if (process.argv.includes('--check')) {
  const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (cur !== body) {
    console.error('[check:prompt] lib/readings/prompt-spec.generated.ts 与 docs/prompt-liuyao.md 不一致，请运行 npm run gen:prompt');
    process.exit(1);
  }
  console.log(`[check:prompt] OK（${text.length} 字 / ${Object.keys(chapters).length} 章 / ${Object.keys(formats).length} 个输出清单，与规范一致）`);
} else {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body, 'utf8');
  console.log(
    `[gen:prompt] 写入 ${path.relative(root, out)}：${text.length} 字 / ${Object.keys(chapters).length} 章 / ${Object.keys(formats).length} 个输出清单`,
  );
}

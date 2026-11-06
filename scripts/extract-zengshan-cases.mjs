#!/usr/bin/env node
/**
 * 从《增删卜易卦例初探》（朱辰彬）整理文本里抽取前 N 例，生成前台「案例」页的数据。
 *
 *   node scripts/extract-zengshan-cases.mjs <源txt> [数量]
 *
 * 输出：public/data/zengshan-cases.json（静态资源，页面按需 fetch，不进 JS bundle）
 *
 * 只做结构化：例号 / 古筮知识 / 占问 / 干支旬空 / 本卦变卦 / 原注 / 用神·吉凶·应期要点。
 * 原文按长度截断，保留「可读的一小段」，不做改写、不做补全。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pkg from 'lunar-javascript';

const { Lunar } = pkg;

/**
 * 卦名 → 六爻二进制（初爻在下，与 lib/liuyao/najia.ts 同约定）
 * 名字规律：第 1 字是上卦的象（天泽火雷风山水地），第 2 字是下卦的象；
 * 八纯卦写成「乾为天」，下卦的象落在第 3 字。
 */
const TRIGRAM_BITS = { 乾: '111', 天: '111', 兑: '110', 泽: '110', 离: '101', 火: '101', 震: '100', 雷: '100', 巽: '011', 风: '011', 坎: '010', 水: '010', 艮: '001', 山: '001', 坤: '000', 地: '000' };

function binaryOfName(name) {
  if (!name || name.length < 3) return '';
  // 「乾为天」→ 上乾下天；「天风姤」→ 上天下风
  const lowerChar = name[1] === '为' ? name[2] : name[1];
  const upper = TRIGRAM_BITS[name[0]];
  const lower = TRIGRAM_BITS[lowerChar];
  if (!upper || !lower) return '';
  return lower + upper; // 初→上：先下卦三爻，再上卦三爻
}

/** 本卦/变卦 → 六次投掷（6/7/8/9）；同位阴阳相异者即动爻 */
function coinsOf(ben, zhi) {
  if (!ben) return [];
  const out = [];
  for (let i = 0; i < 6; i += 1) {
    const b = ben[i] === '1';
    const z = zhi ? zhi[i] === '1' : b;
    const moving = b !== z;
    out.push(b ? (moving ? 9 : 7) : moving ? 6 : 8);
  }
  return out;
}

/**
 * 古例只给「月建 + 日柱」，没有公历年。
 * 在近若干年里找同月建、同日柱的一天，作为「对应公历」，让盘面的月建/日辰/旬空与原例一致。
 */
function findSolar(monthBranch, dayGz, fromYear = 1990, toYear = 2026) {
  if (!monthBranch || !dayGz) return null;
  // 取范围内最早的一次，读起来像「历史日期」，也避免出现未来时间
  let hit = null;
  const d = new Date(Date.UTC(fromYear, 0, 1, 4, 0, 0));
  const end = Date.UTC(toYear, 11, 31, 4, 0, 0);
  while (d.getTime() <= end) {
    const lunar = Lunar.fromDate(d);
    if (!hit && lunar.getMonthInGanZhiExact().slice(-1) === monthBranch && lunar.getDayInGanZhiExact() === dayGz) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      hit = `${y}-${m}-${day}T12:00`;
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return hit;
}

const [, , src, countArg] = process.argv;
if (!src) {
  console.error('用法：node scripts/extract-zengshan-cases.mjs <源txt> [数量]');
  process.exit(1);
}
const LIMIT = Number(countArg || 100);

const raw = fs.readFileSync(src, 'utf8').replace(/\r\n?/g, '\n');

/** 截断：保留语义边界附近的整句，超长才加省略号 */
function clip(text, max) {
  const s = text.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'), cut.lastIndexOf('，'));
  return (stop > max * 0.6 ? cut.slice(0, stop) : cut).trim() + '…';
}

const parts = raw.split(/^例\s*(\d+)\s+/m);
const cases = [];

for (let i = 1; i < parts.length && cases.length < LIMIT; i += 2) {
  const id = Number(parts[i]);
  const body = parts[i + 1] ?? '';
  const lines = body.split('\n');
  const headLine = lines[0] ?? '';

  const topic = headLine.includes('古筮知识：')
    ? clip(headLine.split('古筮知识：')[1] ?? '', 60)
    : clip(headLine, 60);

  // 占问：「辰月戊申日，占父近病，得“乾之小畜”」
  const askLine = lines.find((l) => /得[“"].+?[”"]/.test(l)) ?? '';
  const askMatch = askLine.match(/得[“"]([^”"]+)[”"]/);
  let question = '';
  if (askLine) {
    const before = askLine.split(/得[“"]/)[0] ?? '';
    question = before.replace(/^[^，,]*[，,]/, '').trim().replace(/[，,、；;：:。]+$/, '');
    if (!question) question = before.trim();
  }
  const guaPair = askMatch ? askMatch[1] : '';

  const ganzhiLine = lines.find((l) => l.includes('干支：')) ?? '';
  const ganzhi = ganzhiLine.replace(/^.*?干支：/, '').replace(/\s+/g, ' ').trim();
  const voidMatch = ganzhiLine.match(/旬空：([^)）]+)/);

  // 卦名：`乾宫：乾为天（六冲）` / `巽宫：风天小畜`
  const hexes = [...body.matchAll(/([\u4e00-\u9fa5]{1,2})宫：\s*([\u4e00-\u9fa5]{2,4})\s*(?:[（(]([^）)]+)[）)])?/g)].map((m) => ({
    palace: m[1],
    name: m[2],
    tag: (m[3] || '').trim(),
  }));

  const noteMatch = body.match(/原注：([\s\S]*?)(?=\n\s*1、|\n\s*【|$)/);
  const sec = (n) => {
    const re = new RegExp(`${n}、[^：]*：([\\s\\S]*?)(?=\\n\\s*[123]、|$)`);
    const m = body.match(re);
    return m ? m[1].replace(/\s+/g, ' ').trim() : '';
  };

  const benBinary = binaryOfName(hexes[0]?.name ?? '');
  const zhiBinary = binaryOfName(hexes[1]?.name ?? '');
  const coins = coinsOf(benBinary, zhiBinary);
  // 「辰月」「乙卯月」都算，只取地支
  const monthBranch = (ganzhi.match(/([子丑寅卯辰巳午未申酉戌亥])月/) || [])[1] || '';
  const dayGz = (ganzhi.match(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]日/) || [''])[0].replace('日', '');

  cases.push({
    id,
    topic,
    question: question || '（原文未注明）',
    ganzhi: ganzhi.replace(/[(（]旬空[^)）]*[)）]/, '').trim(),
    void: (voidMatch?.[1] ?? '').trim(),
    guaPair,
    ben: hexes[0]?.name ?? '',
    benPalace: hexes[0]?.palace ?? '',
    benTag: hexes[0]?.tag ?? '',
    zhi: hexes[1]?.name ?? '',
    zhiPalace: hexes[1]?.palace ?? '',
    zhiTag: hexes[1]?.tag ?? '',
    note: noteMatch ? noteMatch[1].replace(/\s+/g, ' ').trim() : '',
    yong: sec(1),
    luck: sec(2),
    timing: sec(3),
    binary: benBinary && zhiBinary ? `${benBinary}>${zhiBinary}` : benBinary,
    coins,
    solar: findSolar(monthBranch, dayGz),
  });
}

const outDir = path.resolve(process.cwd(), 'public', 'data');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'zengshan-cases.json');
fs.writeFileSync(outFile, JSON.stringify({ source: '《增删卜易卦例初探》朱辰彬', count: cases.length, cases }, null, 1), 'utf8');

const missing = {
  coins: cases.filter((c) => c.coins.length !== 6).length,
  solar: cases.filter((c) => !c.solar).length,
  ben: cases.filter((c) => !c.ben).length,
  zhi: cases.filter((c) => !c.zhi).length,
  note: cases.filter((c) => !c.note).length,
  yong: cases.filter((c) => !c.yong).length,
  luck: cases.filter((c) => !c.luck).length,
  timing: cases.filter((c) => !c.timing).length,
};
console.log(`[extract] ${cases.length} 例 → ${path.relative(process.cwd(), outFile)}`);
console.log('[extract] 缺字段统计：', JSON.stringify(missing));
console.log('[extract] 首例：', JSON.stringify(cases[0], null, 1).slice(0, 700));

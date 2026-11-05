/**
 * 从解卦正文里解析「用神」，用于在盘面上高亮那一爻。
 *
 * 为什么用解析而不是让模型额外输出结构：模型已经按要求在第一段明写取用，
 * 多加一个字段反而容易出现"字段与正文不一致"。这里只做保守提取：
 *   1. 先在「取用 / 一、」段落里找形如「父母辛丑土」「妻财未土」「官鬼亥水」的片段；
 *   2. 找不到干支时，认「以财爻为用」「取官鬼为用」这类取用句（含单字简称）；
 *   3. 再退「某某持世」「取世爻」这类说法；
 *   4. 都没有就返回 null —— 宁可不标，也不标错。
 *
 * 地支只在**全文里该六亲只出现一个地支**时才补上（六亲多现则不猜）。
 */

export interface UseGodHint {
  /** 六亲：父母/兄弟/子孙/妻财/官鬼 */
  relation: '父母' | '兄弟' | '子孙' | '妻财' | '官鬼' | null;
  /** 地支（子丑寅…），可能为空 */
  branch: string | null;
  /** 取自「世爻 / 应爻」时给出 */
  role: '世' | '应' | null;
  /** 命中的原文片段，便于在 UI 上回显核对 */
  excerpt: string;
}

const RELATIONS = ['父母', '兄弟', '子孙', '妻财', '官鬼'] as const;
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const STEMS = '甲乙丙丁戊己庚辛壬癸';

type Relation = NonNullable<UseGodHint['relation']>;

/** 取用句里的六亲简称（「以财爻为用」→ 妻财） */
const RELATION_ALIAS: Record<string, Relation> = {
  父母: '父母', 父: '父母',
  兄弟: '兄弟', 兄: '兄弟',
  子孙: '子孙', 孙: '子孙', 子: '子孙',
  妻财: '妻财', 妻: '妻财', 财: '妻财',
  官鬼: '官鬼', 官: '官鬼', 鬼: '官鬼',
};

/** 「以妻财为用」「财爻为用神」「取官鬼为用」 */
const USE_PHRASE =
  /[以取]?\s*(父母|兄弟|子孙|妻财|父|兄|孙|子|妻|财|官|鬼)\s*(?:爻)?\s*(?:为用|作用)/;

/** 只看正文开头的取用段，避免后文"兼看"把结果带偏 */
function headOf(text: string, max = 320): string {
  const clean = text.replace(/\*\*/g, '').replace(/\r/g, '');
  const cut = clean.search(/二、|【二】/);
  return cut > 0 ? clean.slice(0, cut) : clean.slice(0, max);
}

/** 全文里该六亲只对应唯一地支时才返回，六亲多现则返回 null */
function uniqueBranchOf(text: string, relation: string): { branch: string; excerpt: string } | null {
  const re = new RegExp(`${relation}[\\s]?([${STEMS}])?([${BRANCHES}])[金木水火土]?`, 'g');
  const seen = new Map<string, string>();
  for (let m = re.exec(text); m; m = re.exec(text)) seen.set(m[2], m[0]);
  if (seen.size !== 1) return null;
  const [branch, excerpt] = [...seen.entries()][0];
  return { branch, excerpt };
}

export function parseUseGod(text: string): UseGodHint | null {
  if (!text || !text.trim()) return null;
  const head = headOf(text);
  const full = text.replace(/\*\*/g, '').replace(/\r/g, '');

  // 1) 六亲 + 可选天干 + 地支（+ 五行）——最精确
  for (const rel of RELATIONS) {
    const re = new RegExp(`${rel}[\\s]?([${STEMS}])?([${BRANCHES}])`, 'g');
    const m = re.exec(head);
    if (m) {
      return {
        relation: rel,
        branch: m[2],
        role: null,
        excerpt: m[0],
      };
    }
  }

  // 2) 取用句：「以财爻为用神」——只取六亲，地支回全文补（唯一才补）
  const use = head.match(USE_PHRASE);
  const relation = use ? RELATION_ALIAS[use[1]] : null;
  if (relation) {
    const hit = uniqueBranchOf(full, relation);
    return {
      relation,
      branch: hit?.branch ?? null,
      role: null,
      excerpt: hit?.excerpt ?? relation,
    };
  }

  // 3) 「某某持世」「取世爻」优先于纯六亲兜底
  const world = head.match(/([父母兄弟子孙妻财官鬼])(?:爻)?持世|取?世爻/);
  if (world) {
    return {
      relation: (world[1] as UseGodHint['relation']) ?? null,
      branch: null,
      role: '世',
      excerpt: world[0],
    };
  }

  // 4) 只写了六亲（正文没给地支）：取最早出现的那个
  let earliest: { rel: (typeof RELATIONS)[number]; at: number } | null = null;
  for (const rel of RELATIONS) {
    const at = head.indexOf(rel);
    if (at >= 0 && (!earliest || at < earliest.at)) earliest = { rel, at };
  }
  if (earliest) {
    return { relation: earliest.rel, branch: null, role: null, excerpt: earliest.rel };
  }

  // 5) 应爻为用
  if (/取?应爻/.test(head)) {
    return { relation: null, branch: null, role: '应', excerpt: '应爻' };
  }

  return null;
}

/** 用神提示 → 盘面第几爻（1..6）；无法唯一确定时返回 null */
export function resolveUseGodLine(
  hint: UseGodHint | null,
  lines: { position: number; relation: string; branch: string; isWorld: boolean; isResponse: boolean }[],
): number | null {
  if (!hint) return null;

  if (hint.role === '世') {
    return lines.find((l) => l.isWorld)?.position ?? null;
  }
  if (hint.role === '应') {
    return lines.find((l) => l.isResponse)?.position ?? null;
  }
  if (hint.relation && hint.branch) {
    // 给了地支就只认精确匹配：对不上宁可不标，也不退回到「六亲唯一」去猜
    return lines.find((l) => l.relation === hint.relation && l.branch === hint.branch)?.position ?? null;
  }
  if (hint.relation) {
    const same = lines.filter((l) => l.relation === hint.relation);
    // 六亲多现时不猜：只有唯一一爻才高亮
    if (same.length === 1) return same[0].position;
  }
  return null;
}

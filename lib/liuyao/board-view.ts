/**
 * 六爻盘面（古法卦单）的视图契约与辅助函数。
 *
 * 版式与 bazi-web `components/zhanbu/MobileHexagramPoster.tsx`（variant="embedded"）逐字对齐；
 * 这里的类型只保留盘面真正读取的字段，去掉门类、用神、评分等断语侧数据。
 */

import type { LiuyaoChart, LiuyaoLine } from './najia';
import type { CastTimeInfo } from './ganzhi';

export const BRANCH_ELEMENTS: Record<string, string> = {
  子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火',
  申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土',
};

const ELEMENT_SHENG_MAP: Record<string, string> = {
  木: '火', 火: '土', 土: '金', 金: '水', 水: '木',
};

const ELEMENT_KE_MAP: Record<string, string> = {
  木: '土', 土: '水', 水: '火', 火: '金', 金: '木',
};

const SIX_HE_PAIRS: Record<string, string> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
};

const SIX_CHONG_PAIRS: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
};

export interface BoardLineData {
  position: number;
  stem: string;
  branch: string;
  element: string;
  relation: string;
  is_yang: boolean;
  six_god: string;
  is_world: boolean;
  is_response: boolean;
  is_moving: boolean;
  mutated_relation?: string;
  changed_line?: {
    stem?: string;
    branch: string;
    element: string;
    relation: string;
    is_void?: boolean;
  };
  hidden_spirit?: {
    stem?: string;
    branch: string;
    element: string;
    relation: string;
    desc: string;
  };
}

export interface BoardViewProps {
  question: string;
  gender: string;
  datetime_info: {
    solar_date: string;
    ganzhi: string;
    void_branches: string[];
    month_body?: string;
  };
  hexagram_info: {
    base_name: string;
    changed_name?: string | null;
    palace?: string;
  };
  lines: BoardLineData[];
}

/** 公历日期显示：解析「2026年11月5日 12:02」等形态，无法识别则原样返回 */
export function formatSolarDateDisplay(solarDate?: string, ganzhi?: string): string {
  if (!solarDate || solarDate === '未显示' || solarDate === ganzhi || !/\d/.test(solarDate)) {
    return '未显示';
  }
  const clean = solarDate.trim();
  const m = clean.match(
    /((?:18|19|20)\d{2})[年\-\/\.]\s*(\d{1,2})[月\-\/\.]\s*(\d{1,2})(?:日|号)?(?:\s*(?:(?:[上下]午\s*)?(\d{1,2})[:：点时](\d{1,2})?)?)?/,
  );
  if (m) {
    const y = m[1];
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    const h = m[4] !== undefined ? String(parseInt(m[4], 10)).padStart(2, '0') : null;
    const min = m[5] !== undefined ? String(parseInt(m[5], 10)).padStart(2, '0') : h !== null ? '00' : null;
    if (h !== null && min !== null) return `${y}年${mo}月${d}日 ${h}:${min}`;
    return `${y}年${mo}月${d}日`;
  }
  return clean;
}

/** 动变标签：回头生 / 回头克 / 进神 / 退神 / 伏吟 / 六合 / 六冲 */
export function getMutatedRelationTags(
  baseBranch: string,
  baseElement?: string,
  changedBranch?: string,
  changedElement?: string,
  backendMutatedRelation?: string,
): string[] {
  const tags: string[] = [];
  if (!changedBranch) return tags;
  const cElem = changedElement || BRANCH_ELEMENTS[changedBranch] || '';
  const bElem = baseElement || BRANCH_ELEMENTS[baseBranch] || '';
  const isSameElement = Boolean(cElem && bElem && cElem === bElem);
  if (!isSameElement && cElem && bElem) {
    if (ELEMENT_SHENG_MAP[cElem] === bElem) tags.push('回头生');
    else if (ELEMENT_KE_MAP[cElem] === bElem) tags.push('回头克');
  }

  const JIN_SHEN_PAIRS: Record<string, string> = {
    亥: '子', 寅: '卯', 巳: '午', 申: '酉',
    丑: '辰', 辰: '未', 未: '戌', 戌: '丑',
  };
  const TUI_SHEN_PAIRS: Record<string, string> = {
    子: '亥', 卯: '寅', 午: '巳', 酉: '申',
    辰: '丑', 丑: '戌', 戌: '未', 未: '辰',
  };

  if (baseBranch === changedBranch) {
    if (!tags.includes('伏吟')) tags.push('伏吟');
  } else {
    if (JIN_SHEN_PAIRS[baseBranch] === changedBranch) tags.push('进神');
    else if (TUI_SHEN_PAIRS[baseBranch] === changedBranch) tags.push('退神');
    if (backendMutatedRelation) {
      const cleaned = backendMutatedRelation.replace(/[\[\]]/g, '');
      if (cleaned.includes('六合合绊') && !tags.includes('六合合绊')) {
        tags.push('六合合绊');
      } else if (cleaned.includes('进神') && !tags.includes('进神')) {
        tags.push('进神');
      } else if (cleaned.includes('退神') && !tags.includes('退神')) {
        tags.push('退神');
      } else if (cleaned.includes('化进') && !tags.includes('进神') && !tags.includes('化进')) {
        tags.push('化进');
      } else if (cleaned.includes('化退') && !tags.includes('退神') && !tags.includes('化退')) {
        tags.push('化退');
      }
    }
  }

  if (SIX_HE_PAIRS[baseBranch] === changedBranch && !tags.includes('六合合绊')) tags.push('六合');
  if (SIX_CHONG_PAIRS[baseBranch] === changedBranch) tags.push('六冲');

  return tags;
}

function toBoardLine(line: LiuyaoLine): BoardLineData {
  return {
    position: line.position,
    stem: line.stem,
    branch: line.branch,
    element: line.element,
    relation: line.relation,
    is_yang: line.isYang,
    six_god: line.sixGod,
    is_world: line.isWorld,
    is_response: line.isResponse,
    is_moving: line.isMoving,
    // 动变标签由 getMutatedRelationTags 依纳甲五行现算；不再注入规则层结论
    mutated_relation: undefined,
    changed_line: line.changedLine
      ? {
          stem: line.changedLine.stem,
          branch: line.changedLine.branch,
          element: line.changedLine.element,
          relation: line.changedLine.relation,
        }
      : undefined,
    hidden_spirit: line.hiddenSpirit
      ? {
          stem: line.hiddenSpirit.stem,
          branch: line.hiddenSpirit.branch,
          element: line.hiddenSpirit.element,
          relation: line.hiddenSpirit.relation,
          desc: line.hiddenSpirit.flyRelationDesc,
        }
      : undefined,
  };
}

/** 引擎结果 → 盘面视图数据 */
export function chartToBoardProps(
  chart: LiuyaoChart,
  time: CastTimeInfo,
  question: string,
  gender: '男' | '女',
): BoardViewProps {
  return {
    question,
    gender,
    datetime_info: {
      solar_date: time.solarText,
      ganzhi: time.ganzhiText,
      void_branches: chart.voidBranches as string[],
      month_body: chart.monthBody.branch,
    },
    hexagram_info: {
      base_name: chart.base.name,
      changed_name: chart.changed?.name ?? null,
      palace: chart.base.palace,
    },
    lines: chart.lines.map(toBoardLine),
  };
}

const POSITION_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

/** 盘面纯文本（复制用）：字段与原项目 formatBoardText 同源，只是去掉断语与提示词 */
export function boardToText(props: BoardViewProps): string {
  const { question, gender, datetime_info, hexagram_info, lines } = props;
  const voidStr = datetime_info.void_branches?.length ? datetime_info.void_branches.join('') : '无';
  const sorted = [...lines].sort((a, b) => b.position - a.position);
  const moving = lines.filter((l) => l.is_moving).sort((a, b) => a.position - b.position);
  const movingDesc = moving.length === 0
    ? '六爻安静'
    : moving.length === 1
      ? `${POSITION_NAMES[moving[0].position - 1]}动（独发）`
      : moving.map((l) => `${POSITION_NAMES[l.position - 1]}动`).join('、');

  const changedName =
    hexagram_info.changed_name && hexagram_info.changed_name !== hexagram_info.base_name
      ? hexagram_info.changed_name
      : '无';

  const header = [
    `占问：${question?.trim() || '占问事宜'}`,
    `性别：${gender}    时间：${formatSolarDateDisplay(datetime_info.solar_date, datetime_info.ganzhi)}`,
    `干支：${datetime_info.ganzhi} (旬空 ${voidStr})`,
    datetime_info.month_body ? `卦身：${datetime_info.month_body}` : null,
    `本卦：${hexagram_info.base_name}${hexagram_info.palace ? ` (${hexagram_info.palace}宫)` : ''} ──────> 变卦：${changedName}`,
    `动爻：${movingDesc}`,
    '',
    changedName !== '无'
      ? `六神　　　　${hexagram_info.base_name}　　　　${changedName}`
      : `六神　　${hexagram_info.base_name}`,
  ].filter((x) => x !== null) as string[];

  const rows = sorted.map((l) => {
    const bar = l.is_yang ? '▅▅▅▅▅' : '▅▅  ▅▅';
    const role = l.is_world ? '世' : l.is_response ? '应' : '　';
    const move = l.is_moving ? (l.is_yang ? '○' : '×') : '　';
    const baseInfo = `${l.relation}${l.branch}${l.element}`;
    const hidden = l.hidden_spirit ? `↑伏神:${l.hidden_spirit.relation}${l.hidden_spirit.branch}${l.hidden_spirit.element}` : '';
    const ch = l.changed_line ? `${l.changed_line.relation}${l.changed_line.branch}${l.changed_line.element}` : '';
    return `${l.six_god}　${baseInfo} ${bar} ${role}${move}　${ch}${hidden ? `　${hidden}` : ''}`.trimEnd();
  });

  return [...header, ...rows, '', '《火珠林》纳甲筮法排盘'].join('\n');
}

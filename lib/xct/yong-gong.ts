/**
 * 小成图 · 用宫取用（八宫事类 → 地盘宫位）
 * ==========================================
 * 依据：
 *   - 资料 `新文件1.txt`「小成图的用神取用方法」1–8 条（八宫事类）
 *   - 资料 `男女取用.txt`：已婚男看坤、已婚女看乾；未婚男寻巽（无巽寻兑）、未婚女寻震（无震寻艮）；
 *     生育两派（按求测者性别取宫 / 统看坤宫）
 *   - 资料 `新文件1.txt`：断父母（父乾母坤）、断子女性别、考学（坤）、官运（乾）、牢狱（寻坎）
 *
 * 本文件只提供**表与派别说明**：具体落到哪一宫由解卦者（模型）依题干判定，
 * 这里不做关键词硬猜——猜错了比不猜更糟。UI 允许用户点宫覆盖。
 */

import type { PalaceNumber, Trigram } from './types';
import { GUA_TO_PALACE, PALACE_NAMES, TRIGRAM_BITS } from './constants';

export interface GongTopic {
  palace: PalaceNumber;
  trigram: Trigram;
  /** 该宫所主事类（资料原文归类） */
  topics: string[];
}

/** 八宫事类表（正序：乾六坤二震三巽四坎一离九艮八兑七） */
export const GONG_TOPICS: GongTopic[] = [
  {
    palace: 6,
    trigram: '乾',
    topics: [
      '官运', '事业', '升职', '工作收入', '政策扶持', '工作调动', '级别', '国家', '单位', '上司', '领导',
      '资产', '父亲', '丈夫', '贵人', '已婚女测婚姻',
    ],
  },
  {
    palace: 2,
    trigram: '坤',
    topics: [
      '母亲', '学业', '考学', '学历', '文凭', '文书', '合同', '出版', '教学', '画', '床', '沙发',
      '固定资产', '地产', '坟地', '已婚男测婚姻',
    ],
  },
  {
    palace: 3,
    trigram: '震',
    topics: [
      '动态', '走动', '声音', '名气', '争斗', '口角', '来人', '走失', '纠纷', '官非', '行人外出',
      '未婚女测婚姻（女性桃花）',
    ],
  },
  {
    palace: 4,
    trigram: '巽',
    topics: ['财运', '钱财', '收入', '投资', '资金回拢', '股票', '赌博', '进退两难', '信息', '中介', '经商', '未婚男测婚姻'],
  },
  {
    palace: 1,
    trigram: '坎',
    topics: ['忧愁', '劳累', '失盗', '受骗', '疾病', '暗伤', '官司', '逃走', '陷害'],
  },
  {
    palace: 9,
    trigram: '离',
    topics: ['信息', '文件', '文书', '高兴', '喜悦', '语言', '文明行业', '电器'],
  },
  {
    palace: 8,
    trigram: '艮',
    topics: ['合作', '静止', '稳重', '子息', '房屋', '车', '收获', '得到', '进入', '保护', '固定资产', '厚重物', '中介'],
  },
  {
    palace: 7,
    trigram: '兑',
    topics: ['争执', '口舌', '破坏', '手术', '车祸', '男性桃花', '喜悦', '喜庆'],
  },
];

export type MaritalStatus = 'unmarried' | 'married' | 'unknown';

export interface YongGongHint {
  palace: PalaceNumber;
  palaceName: string;
  role: 'primary' | 'secondary';
  reason: string;
}

/**
 * 婚姻用宫（资料 `男女取用.txt` + `新文件1.txt`）
 * 已婚：男坤、女乾（看该宫天盘卦）。
 * 未婚：以**天盘**寻用神卦 —— 男寻巽，无巽寻兑；女寻震，无震寻艮。
 */
export function marriageYongGong(
  gender: '男' | '女',
  marital: MaritalStatus,
  heaven: Record<PalaceNumber, Trigram>,
): YongGongHint[] {
  if (marital === 'married') {
    return gender === '男'
      ? [{ palace: 2, palaceName: PALACE_NAMES[2], role: 'primary', reason: '已婚男测婚姻，以坤二宫为用' }]
      : [{ palace: 6, palaceName: PALACE_NAMES[6], role: 'primary', reason: '已婚女测婚姻，以乾六宫为用' }];
  }

  if (marital === 'unmarried') {
    const seek = gender === '男' ? (['巽', '兑'] as const) : (['震', '艮'] as const);
    for (const gua of seek) {
      const palace = GUA_TO_PALACE[gua];
      const hit = (Object.entries(heaven) as [string, Trigram][]).find(([, v]) => v === gua);
      if (hit && gua === seek[0]) {
        return [
          {
            palace,
            palaceName: PALACE_NAMES[palace],
            role: 'primary',
            reason: `未婚${gender}测婚姻，天盘见${gua}，以${gua}宫为用`,
          },
        ];
      }
    }
    // 首卦不在天盘，退而用备取之卦所在本宫
    const fallback = seek[1];
    const palace = GUA_TO_PALACE[fallback];
    const has = (Object.values(heaven) as Trigram[]).includes(seek[0]);
    return [
      {
        palace,
        palaceName: PALACE_NAMES[palace],
        role: 'primary',
        reason: has
          ? `天盘见${seek[0]}，取该卦本宫为用`
          : `未婚${gender}测婚姻，天盘无${seek[0]}，退取${fallback}，以${fallback}宫为用`,
      },
    ];
  }

  return [
    { palace: 6, palaceName: PALACE_NAMES[6], role: 'secondary', reason: '婚否未明：男可参坤、女可参乾' },
    { palace: 2, palaceName: PALACE_NAMES[2], role: 'secondary', reason: '婚否未明：男可参坤、女可参乾' },
  ];
}

/**
 * 生育用宫与性别判据（资料 `男女取用.txt`「统看坤宫」派 —— 本项目采用此派）
 *
 *   - 不论求测者性别，一律看地盘坤二宫所落的天盘卦；
 *   - 落 乾、坎、巽、兑 → 男；落 坤、离、震、艮 → 女。
 *
 * 备注：另一派（男看坤、女看艮，坎特例断女）与之冲突，本项目不采用，
 * 仅在 spec 中留档，避免两派混断。
 */
export const BIRTH_GENDER_MAP: Record<Trigram, '男' | '女'> = {
  乾: '男',
  坎: '男',
  巽: '男',
  兑: '男',
  坤: '女',
  离: '女',
  震: '女',
  艮: '女',
};

export function birthYongGong(): YongGongHint {
  return {
    palace: 2,
    palaceName: PALACE_NAMES[2],
    role: 'primary',
    reason: '生育看坤宫天盘卦（不论求测者性别）',
  };
}

/**
 * 坤宫天盘卦 → 男女，两法并列（资料 `男女取用.txt` 同派的两条准则）：
 *   1. 卦象：乾坎巽兑为男，坤离震艮为女；
 *   2. 中爻：坤宫所得卦的第二爻，阳爻为男、阴爻为女（胎儿未生前可用）。
 * 两法不一致时并列呈现，不强行定一（师传未明言取舍）。
 */
export function birthGenderByHeaven(heaven: Record<PalaceNumber, Trigram>): {
  gua: Trigram;
  byTrigram: '男' | '女';
  middleYao: { yang: boolean; gender: '男' | '女' };
  agree: boolean;
} {
  const gua = heaven[2];
  const byTrigram = BIRTH_GENDER_MAP[gua];
  const yang = TRIGRAM_BITS[gua][1] === 1;
  const middleGender: '男' | '女' = yang ? '男' : '女';
  return {
    gua,
    byTrigram,
    middleYao: { yang, gender: middleGender },
    agree: byTrigram === middleGender,
  };
}

/** 父母用宫：父看乾六、母看坤二 */
export function parentYongGong(who: '父' | '母'): YongGongHint {
  const palace: PalaceNumber = who === '父' ? 6 : 2;
  return { palace, palaceName: PALACE_NAMES[palace], role: 'primary', reason: `断${who}亲，以${PALACE_NAMES[palace]}为用` };
}

/** 固定单宫项 */
export const FIXED_YONG_GONG = {
  /** 考学、学历、文凭 → 坤（天盘坤亦可直断学历） */
  study: 2,
  /** 官运、事业 → 乾（再以天盘乾所落之宫定行业） */
  career: 6,
  /** 求财、经商 → 巽 */
  wealth: 4,
  /** 疾病、暗伤、失盗 → 坎 */
  illness: 1,
  /** 出行、失物、来人 → 震 */
  travel: 3,
  /** 合作、房屋、子息 → 艮 */
  cooperation: 8,
  /** 口舌、争执、手术、车祸 → 兑 */
  dispute: 7,
  /** 文书、信息、喜庆 → 离 */
  document: 9,
} as const;

/** 牢狱/官非：天盘寻坎，坎所在之宫为用 */
export function prisonYongGong(heaven: Record<PalaceNumber, Trigram>): YongGongHint {
  const hit = (Object.entries(heaven) as [string, Trigram][]).find(([, v]) => v === '坎');
  const palace = hit ? Number(hit[0]) as PalaceNumber : GUA_TO_PALACE['坎'];
  return {
    palace,
    palaceName: PALACE_NAMES[palace],
    role: 'primary',
    reason: hit ? '牢狱看坎：天盘有坎，取坎所在之宫' : '牢狱看坎：天盘无坎，取坎一本宫',
  };
}

/** 卦名 → 中文说明（中宫归藏用） */
export const PALACE_NAMES_TEXT: Record<Trigram, string> = {
  乾: '乾为天，刚健',
  坤: '坤为地，柔顺',
  震: '震为雷，动',
  巽: '巽为风，入',
  坎: '坎为水，陷',
  离: '离为火，丽',
  艮: '艮为山，止',
  兑: '兑为泽，说',
};

/** 供 prompt 使用的八宫表纯文本 */
export function gongTableText(): string {
  return GONG_TOPICS.map((g) => `${PALACE_NAMES[g.palace]}：${g.topics.join('、')}`).join('\n');
}

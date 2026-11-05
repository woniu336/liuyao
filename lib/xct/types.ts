export type Trigram = '乾' | '兑' | '离' | '震' | '巽' | '坎' | '艮' | '坤';

export type PalaceNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type FourImagesMode = '阖' | '辟' | '往' | '来';

export type EightVerdicts = '吉' | '凶' | '害' | '利' | '吝' | '悔' | '贞' | '亨' | '归藏之枢' | '归位';

export interface HexagramPair {
  upper: Trigram;
  lower: Trigram;
}

export interface BoardState {
  ben: HexagramPair;
  zhi: HexagramPair;
  benHu: HexagramPair;
  zhiHu: HexagramPair;
  heaven: Record<PalaceNumber, Trigram>;
  center: Trigram;
  centerSteps: {
    a: Trigram;
    b: Trigram;
    mid1: Trigram;
    mid2: Trigram;
  };
}

export interface PalaceJudgment {
  palace: PalaceNumber;
  palaceName: string;
  heaven: Trigram;
  earth: string;
  mode: FourImagesMode | null;
  matched: boolean | null;
  verdict: EightVerdicts;
  hexName: string;
  meaning: string;
}

export interface ZhengTuiNode {
  palace: PalaceNumber;
  palaceName: string;
  heaven: Trigram;
  judgment: PalaceJudgment;
  isLoopOrEnd: boolean;
}

export interface ZhengTuiChain {
  startPalace: PalaceNumber;
  nodes: ZhengTuiNode[];
  path: PalaceNumber[];
  hasCycle: boolean;
  /** 收敛方式：归位（气止得位）/ 闭环（互飞成环）/ 入中宫（气归本质）/ 未收敛 */
  endReason?: 'guiwei' | 'cycle' | 'center' | 'open';
  summary: string;
}

export interface DivinationRequest {
  question: string;
  method: 'four' | 'time' | 'manual';
  tianDiNums?: [number, number, number, number];
  solarDate?: string;
  manualBenUpper?: Trigram;
  manualBenLower?: Trigram;
  manualZhiUpper?: Trigram;
  manualZhiLower?: Trigram;
  movingYao?: number;
}

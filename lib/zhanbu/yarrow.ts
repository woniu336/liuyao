/**
 * 大衍筮法 · 十八变引擎
 *
 * 行为逐位对齐 rea/demo/l1_tk.py 的 YarrowSession。
 *
 * 一变四步：分二 → 挂一 → 揲四 → 归奇
 * 一爻三变，一卦六爻。三变后 余蓍 ÷ 4 ∈ {6,7,8,9} 即爻数。
 *
 * 铁律：随机性只有「分二」这一个入口。挂一 / 揲四 / 归奇 三步为纯计算，
 * 绝不允许出现任何 Math.random()，否则十八变退化为随机数生成器。
 */

import type { CoinResult } from '@/components/liuyao/types';

/** 大衍之数五十，其用四十有九。 */
export const TOTAL_STICKS = 49;

/** 一变的四个阶段。 */
export type YarrowPhase = 'split' | 'gua' | 'she' | 'gui';

export interface YarrowState {
  /** 本爻已完成的变数 0..2 */
  bian: number;
  /** 手中蓍草 */
  sticks: number;
  /** 左堆（分二后有效） */
  left: number;
  right: number;
  /** 挂一后右堆 */
  rightAfterGua: number;
  /** 揲四左余 1..4 */
  leftRemain: number;
  rightRemain: number;
  /** 本爻三变的归奇数 */
  gui: number[];
  /** 已定之爻，[0] 初爻 */
  values: CoinResult[];
}

export const initialState = (): YarrowState => ({
  bian: 0,
  sticks: TOTAL_STICKS,
  left: 0,
  right: 0,
  rightAfterGua: 0,
  leftRemain: 0,
  rightRemain: 0,
  gui: [],
  values: [],
});

/** 分二。越界夹取到 1..sticks-1，与 l1_tk.py 的 split_x_to_left 一致。 */
export function split(s: YarrowState, left: number): YarrowState {
  const n = s.sticks;
  const l = Math.max(1, Math.min(n - 1, Math.trunc(left)));
  return { ...s, left: l, right: n - l, rightAfterGua: 0, leftRemain: 0, rightRemain: 0 };
}

/** 挂一：从右堆取一根，象三。 */
export const gua = (s: YarrowState): YarrowState => ({
  ...s,
  rightAfterGua: s.right - 1,
});

/**
 * 揲四：左右各四四数之，余数记扐，整除记四。
 *
 * 「整除记四」不是笔误：归奇要拨出去的是「扐」这一束，奇不得为零，
 * 恰尽时仍拨四根（象闰）。若按零计，一变只去 1 根，49 → 48，48÷4 = 12，
 * 四象（6/7/8/9）里根本没有 12，十八变直接崩掉。
 * 原版 core.py 亦作 `left % 4 if left % 4 != 0 else 4`。
 */
export const she = (s: YarrowState): YarrowState => ({
  ...s,
  leftRemain: s.left % 4 || 4,
  rightRemain: s.rightAfterGua % 4 || 4,
});

/** 归奇：余数 + 挂一，一并去除。 */
export function gui(s: YarrowState): { state: YarrowState; removed: number } {
  const removed = s.leftRemain + s.rightRemain + 1;
  return {
    state: { ...s, sticks: s.sticks - removed, gui: [...s.gui, removed] },
    removed,
  };
}

/**
 * 三变已毕，定爻。sticks/4 ∈ {6,7,8,9}，直接就是 CoinResult。
 *
 * 六爻既备后不再重置 sticks —— 保留最后余蓍，供终局回看。
 */
export function finalize(s: YarrowState): YarrowState {
  const value = s.sticks / 4 as CoinResult;
  if (!Number.isInteger(value) || value < 6 || value > 9) {
    throw new RangeError(`定爻异常：剩余 ${s.sticks} 根`);
  }
  const values = [...s.values, value];
  const done = values.length >= 6;
  return {
    ...s,
    values,
    bian: 0,
    sticks: done ? s.sticks : TOTAL_STICKS,
    left: 0,
    right: 0,
    rightAfterGua: 0,
    leftRemain: 0,
    rightRemain: 0,
    gui: [],
  };
}

/**
 * 走完一变。第三变直接定爻。
 *
 * 只接受「已分二」的状态：分二是人的动作，必须由 UI 显式调用 split() 后再 advance()。
 */
export function advance(s: YarrowState): YarrowState {
  if (s.left < 1 || s.right < 1) {
    throw new RangeError(`未分二即推变：左 ${s.left} 右 ${s.right}`);
  }
  const { state } = gui(she(gua(s)));
  return state.bian === 2 ? finalize(state) : { ...state, bian: state.bian + 1 };
}

export const isComplete = (s: YarrowState): boolean => s.values.length === 6;

/** 撤一爻：回退到上一爻起手处，重新执四十九策。 */
export function undo(s: YarrowState): YarrowState {
  if (s.values.length === 0) return s;
  return {
    ...initialState(),
    values: s.values.slice(0, -1),
  };
}

/**
 * 自动分二落点。
 *
 * 上界必须是 4 的倍数：决定爻数的是 left mod 4，取值范围若不是整周期，
 * 端点会多算一个余数。实测 randint(1, n-1) 会让老阳从 18.75% 偏到 19.77%，
 * randint(1, n-2) 偏到 21.17%。用 4*floor((n-1)/4) 才是严格的 1:5:7:3。
 */
export function nextSplit(sticks: number, rng: () => number = Math.random): number {
  const hi = 4 * Math.floor((sticks - 1) / 4);
  return 1 + Math.floor(rng() * hi);
}

/**
 * 这一次"分二"是不是空动作。
 *
 * 按下与松手停在同一根蓍草上，说明这一下没有"分"的意思，不能当一次分二。
 * 若照旧提交，left 被钉在同一值，left mod 4 也随之固定，该爻就被锁死 ——
 * 早前截图脚本每次拖同一位置，六爻全出 8，正是这个原因。
 *
 * 注意：这不是概率修正，只是拒绝一个没有信息量的输入；
 * 正常拖动（哪怕只挪一根）照旧松手即确认。
 */
export function isIdleSplit(downK: number | null, upK: number): boolean {
  return downK !== null && upK === downK;
}

/** 一变的中间量（纯计算，供 UI 在挂一/揲四/归奇阶段预览，不落 state）。 */
export interface BianPreview {
  rightAfterGua: number;
  leftRemain: number;
  rightRemain: number;
  removed: number;
}

export function previewBian(left: number, right: number): BianPreview {
  const rightAfterGua = right - 1;
  const leftRemain = left % 4 || 4;
  const rightRemain = rightAfterGua % 4 || 4;
  return { rightAfterGua, leftRemain, rightRemain, removed: leftRemain + rightRemain + 1 };
}

/**
 * 蓍草铺陈几何。
 *
 * 间距必须是「可用宽度 ÷ 当前蓍草数」（对齐原版 draw_top_pile 的 `gap = TOP_W / n`），
 * 而不是固定按四十九策算 —— 否则一变之后手里只剩四十四策，蓍草会缩在左边、
 * 右侧空出一大块，拖动分割线时人会不自觉往左偏，分二分布就此失真。
 *
 * 取 (i + 0.5) * step 使整列左右对称（原版用 i * step，右端恒少半个到一个间距）。
 */
export function stickLayout(n: number, width: number, margin: number) {
  const usable = width - margin * 2;
  const step = usable / Math.max(n, 1);
  const xs = Array.from({ length: n }, (_, i) => margin + (i + 0.5) * step);
  /** 第 k 根与第 k+1 根之间的分割线位置（即两策中点，与原版 snap_split_x 一致） */
  const divider = (k: number) => margin + k * step;
  return { step, xs, divider };
}

/** 完整跑一爻，返回爻值与三次分二记录（测试 / 自动模式用）。 */
export function runYao(sticks = TOTAL_STICKS, rng: () => number = Math.random) {
  let s: YarrowState = { ...initialState(), sticks };
  const splits: number[] = [];
  for (let i = 0; i < 3; i++) {
    splits.push(nextSplit(s.sticks, rng));
    s = advance(split(s, splits[splits.length - 1]));
  }
  return { value: s.values[0], splits };
}

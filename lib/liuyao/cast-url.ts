/**
 * 起卦参数在 URL 里的编解码。
 *
 * 为什么放 URL：卦是"一次投掷的时点产物"，刷新、收藏、分享都该复原同一卦，
 * 而页面本身仍是静态的（不在服务端存任何会话状态）。
 *
 * 参数刻意短：coins 用 0/1/2/3 表示 6/7/8/9（一位就能表达一爻），
 * 性别用 g=男/女，婚否用 m=0/1。
 */

import type { CoinResult } from '@/components/liuyao/types';

export interface CastState {
  coins: CoinResult[];
  /** datetime-local：YYYY-MM-DDTHH:mm */
  timeInput: string;
  gender: '男' | '女';
  marital: 'unmarried' | 'married';
  question: string;
}

const TO_DIGIT: Record<number, string> = { 6: '0', 7: '1', 8: '2', 9: '3' };
const FROM_DIGIT: Record<string, CoinResult> = { 0: 6, 1: 7, 2: 8, 3: 9 };

export function encodeCastState(state: CastState): string {
  const p = new URLSearchParams();
  p.set('c', state.coins.map((v) => TO_DIGIT[v]).join(''));
  p.set('t', state.timeInput);
  p.set('g', state.gender);
  p.set('m', state.marital === 'married' ? '1' : '0');
  if (state.question.trim()) p.set('q', state.question.trim().slice(0, 200));
  return p.toString();
}

export function decodeCastState(params: URLSearchParams): CastState | null {
  const c = params.get('c');
  const t = params.get('t');
  if (!c || !t) return null;
  if (!/^[0-3]{6}$/.test(c)) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)) return null;

  const coins = c.split('').map((d) => FROM_DIGIT[d]) as CoinResult[];
  const g = params.get('g') === '女' ? '女' : '男';
  const marital = params.get('m') === '1' ? 'married' : 'unmarried';

  return { coins, timeInput: t, gender: g, marital, question: params.get('q') ?? '' };
}

/** 爻值 → 三枚币面（仅用于展示） */
export function coinSidesOf(value: number): ('字' | '背')[] {
  switch (value) {
    case 6:
      return ['字', '字', '字'];
    case 7:
      return ['背', '字', '字'];
    case 8:
      return ['字', '背', '背'];
    case 9:
      return ['背', '背', '背'];
    default:
      return ['字', '背', '字'];
  }
}

import { describe, expect, it } from 'vitest';
import { coinSidesOf, decodeCastState, encodeCastState } from '../lib/liuyao/cast-url';
import { binaryOf, movingBetween } from '../components/cast/GuaPicker';
import { structureFromCoins } from '../lib/xct/yi-bian';

describe('起卦参数的 URL 编解码', () => {
  const state = {
    coins: [6, 7, 8, 9, 7, 7] as const,
    timeInput: '2026-11-05T17:20',
    gender: '女' as const,
    marital: 'married' as const,
    question: '此事可否推进',
  };

  it('编码后可无损解回', () => {
    const qs = encodeCastState({ ...state, coins: [...state.coins] });
    const back = decodeCastState(new URLSearchParams(qs));
    expect(back).toEqual({ ...state, coins: [...state.coins] });
  });

  it('参数不合法一律返回 null（不猜）', () => {
    expect(decodeCastState(new URLSearchParams(''))).toBeNull();
    expect(decodeCastState(new URLSearchParams('c=0123&t=2026-11-05T17:20'))).toBeNull(); // 只有 4 位
    // 每位只能是 0–3（对应 6/7/8/9），出现 4/5 视为非法
    expect(decodeCastState(new URLSearchParams('c=012345&t=2026-11-05T17:20'))).toBeNull();
    expect(decodeCastState(new URLSearchParams('c=012301&t=bad'))).toBeNull();
    expect(decodeCastState(new URLSearchParams('c=012301&t=2026-11-05T17:20'))).not.toBeNull();
  });

  it('缺省性别/婚否/问句有确定默认，不产生 undefined', () => {
    const back = decodeCastState(new URLSearchParams('c=111111&t=2026-11-05T17:20'));
    expect(back).toMatchObject({ gender: '男', marital: 'unmarried', question: '' });
  });

  it('爻值 → 三枚币面与三钱法一致', () => {
    expect(coinSidesOf(6)).toEqual(['字', '字', '字']);
    expect(coinSidesOf(9)).toEqual(['背', '背', '背']);
    expect(coinSidesOf(7).filter((s) => s === '背')).toHaveLength(1);
    expect(coinSidesOf(8).filter((s) => s === '背')).toHaveLength(2);
  });
});

describe('手动指定：动爻由两卦比对自动得出', () => {
  it('乾为天 → 天风姤：初爻动', () => {
    expect(movingBetween('111111', '011111')).toEqual([1]);
  });
  it('乾坤互变：六爻皆动', () => {
    expect(movingBetween('111111', '000000')).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('本卦 = 变卦：静卦，无动爻', () => {
    expect(movingBetween('101010', '101010')).toEqual([]);
  });
  it('上下卦拼装顺序：初爻在下', () => {
    // 乾上坤下 = 天地否 → 111000
    expect(binaryOf('111', '000')).toBe('000111');
  });
});

describe('静卦也能立小成图（宜变法）', () => {
  it('全静 7 → 宜变之爻翻出之卦', () => {
    const s = structureFromCoins([7, 7, 7, 7, 7, 7]);
    expect(s.moving).toHaveLength(1);
    expect(s.zhiSource).toBe('yibian');
    expect(s.ben).toEqual({ upper: '乾', lower: '乾' });
    expect(s.zhi).not.toEqual(s.ben);
  });

  it('有动爻时之卦由动爻决定，不动用宜变', () => {
    const s = structureFromCoins([9, 7, 7, 7, 7, 7]);
    expect(s.moving).toEqual([1]);
    expect(s.zhiSource).toBe('moving');
  });
});

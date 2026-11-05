import { describe, expect, it } from 'vitest';
import { parseUseGod, resolveUseGodLine } from '../lib/liuyao/use-god';

const lines = [
  { position: 1, relation: '父母', branch: '丑', isWorld: true, isResponse: false },
  { position: 2, relation: '兄弟', branch: '酉', isWorld: false, isResponse: false },
  { position: 3, relation: '子孙', branch: '亥', isWorld: false, isResponse: false },
  { position: 4, relation: '官鬼', branch: '午', isWorld: false, isResponse: true },
  { position: 5, relation: '父母', branch: '戌', isWorld: false, isResponse: false },
  { position: 6, relation: '妻财', branch: '寅', isWorld: false, isResponse: false },
];

describe('用神解析（仅供高亮，不参与断卦）', () => {
  it('六亲 + 天干 + 地支：精确定位', () => {
    const hint = parseUseGod('一、取用\n自占项目，取父母辛丑土为用神，因其持世且动。\n\n二、盘面\n…');
    expect(hint).toMatchObject({ relation: '父母', branch: '丑', role: null });
    expect(resolveUseGodLine(hint, lines)).toBe(1);
  });

  it('带「持世」时落世爻', () => {
    const hint = parseUseGod('一、取用\n取兄弟持世为用。');
    expect(hint?.role).toBe('世');
    expect(resolveUseGodLine(hint, lines)).toBe(1);
  });

  it('只说六亲、且六亲多现时不猜爻位', () => {
    const hint = parseUseGod('一、取用\n以父母为用神，兼看官鬼。');
    const ambiguous = resolveUseGodLine(hint, lines);
    // 父母两现（第 1、5 爻），宁可不标
    expect(ambiguous).toBeNull();
  });

  it('六亲唯一时可直接定位', () => {
    const hint = parseUseGod('一、取用\n以妻财为用神。');
    expect(resolveUseGodLine(hint, lines)).toBe(6);
  });

  it('只看取用段，不被后文「兼看」带偏', () => {
    const text = '一、取用\n取子孙为用。\n二、盘面\n兼看妻财辛丑土与官鬼。';
    const hint = parseUseGod(text);
    expect(hint?.relation).toBe('子孙');
  });

  it('取用句用简称（财爻）时认作六亲，地支回全文唯一补齐', () => {
    const text = '一、取用\n财爻为用，月建临之，日辰生扶。\n\n二、盘面\n用神妻财丑土临应。';
    const hint = parseUseGod(text);
    expect(hint).toMatchObject({ relation: '妻财', branch: '丑', excerpt: '妻财丑土' });
  });

  it('取用段只给六亲、地支在全文唯一时补齐', () => {
    const text = '一、取用\n取官鬼为用神。\n\n二、盘面\n官鬼亥水发动。';
    const hint = parseUseGod(text);
    expect(hint).toMatchObject({ relation: '官鬼', branch: '亥' });
    // 盘面里没有官鬼亥，不硬指爻位
    expect(resolveUseGodLine(hint, lines)).toBeNull();
  });

  it('全文里同六亲出现两个地支时不给地支', () => {
    const text = '一、取用\n以父母为用神。\n\n二、盘面\n父母辛丑土与父母丙戌土并见。';
    const hint = parseUseGod(text);
    expect(hint?.relation).toBe('父母');
    expect(hint?.branch).toBeNull();
  });

  it('正文没有取用时返回 null，不硬猜', () => {
    expect(parseUseGod('')).toBeNull();
    expect(parseUseGod('二、盘面\n月建戌土当令。')).toBeNull();
  });
});

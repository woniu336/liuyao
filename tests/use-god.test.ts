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

  it('正文没有取用时返回 null，不硬猜', () => {
    expect(parseUseGod('')).toBeNull();
    expect(parseUseGod('二、盘面\n月建戌土当令。')).toBeNull();
  });
});

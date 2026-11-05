/**
 * 卦例记录组装：把一次起卦的「输入」封成可长期保存的记录。
 *
 * 记录里不存盘面（盘面由引擎重算），只存能复现这一卦的最小事实：
 * 六爻 → 时间 + 投掷 + 方法 + 问句 + 性别
 */

import type { LiuyaoChart } from '@/lib/liuyao/najia';
import type { CastTimeInfo } from '@/lib/liuyao/ganzhi';
import type { CaseRecord, LiuyaoMethod } from '@/lib/store/types';

export function newCaseId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 兜底：时间戳 + 随机段（老浏览器没有 randomUUID 时也能用）
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildLiuyaoRecord(args: {
  chart: LiuyaoChart;
  time: CastTimeInfo;
  timeInput: string;
  question: string;
  gender: '男' | '女';
  method: LiuyaoMethod;
  coins: number[];
}): CaseRecord {
  const { chart, timeInput, question, gender, method, coins } = args;
  return {
    id: newCaseId(),
    schema: 1,
    kind: 'liuyao',
    createdAt: new Date().toISOString(),
    timeInput,
    question,
    gender,
    input: { kind: 'liuyao', method, coins, question, gender },
    summary: {
      primary: chart.base.name,
      changed: chart.changed?.name ?? null,
      tags: chart.base.tags,
    },
  };
}

/** 列表里的时间显示：优先显示起卦时间，退回收起时刻 */
export function caseTimeLabel(record: CaseRecord): string {
  const raw = record.timeInput || record.createdAt;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return raw.replace('T', ' ');
  return raw.slice(0, 16).replace('T', ' ');
}

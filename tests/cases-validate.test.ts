import { describe, expect, it } from 'vitest';
import { CaseValidationError, parseCaseRecord } from '../lib/cases/validate';
import type { CaseRecord } from '../lib/store/types';

const liuyao: CaseRecord = {
  id: 'abcdefgh-1234',
  schema: 1,
  kind: 'liuyao',
  createdAt: '2026-11-05T05:00:00.000Z',
  timeInput: '2026-11-05T12:02',
  question: '此事可否推进',
  gender: '女',
  input: { kind: 'liuyao', method: 'coin', coins: [6, 7, 8, 9, 7, 7], question: '此事可否推进', gender: '女' },
  summary: { primary: '天风姤', changed: '乾为天', tags: ['乾宫'] },
};

describe('卦例写入校验', () => {
  it('合法六爻记录可通过，并规范化字段', () => {
    expect(parseCaseRecord(liuyao)).toEqual(expect.objectContaining({ id: liuyao.id, kind: 'liuyao', gender: '女' }));
  });

  it('六爻：投掷必须 6 个且为 6/7/8/9', () => {
    expect(() => parseCaseRecord({ ...liuyao, input: { ...liuyao.input, coins: [7, 7, 7, 7, 7] } })).toThrow(
      CaseValidationError,
    );
    expect(() => parseCaseRecord({ ...liuyao, input: { ...liuyao.input, coins: [7, 7, 7, 7, 7, 5] } })).toThrow(
      CaseValidationError,
    );
    expect(() => parseCaseRecord({ ...liuyao, input: { ...liuyao.input, method: 'whatever' } })).toThrow(
      CaseValidationError,
    );
  });

  it('只接受 kind=liuyao（小成图已下线）', () => {
    expect(() => parseCaseRecord({ ...liuyao, kind: 'xct' })).toThrow(CaseValidationError);
  });

  it('字段长度与格式硬约束', () => {
    expect(() => parseCaseRecord({ ...liuyao, id: 'short' })).toThrow(CaseValidationError);
    expect(() => parseCaseRecord({ ...liuyao, createdAt: '昨天' })).toThrow(CaseValidationError);
    expect(() => parseCaseRecord({ ...liuyao, timeInput: '2026/11/05 12:02' })).toThrow(CaseValidationError);
    expect(() => parseCaseRecord({ ...liuyao, question: '问'.repeat(2001) })).toThrow(CaseValidationError);
    expect(() => parseCaseRecord({ ...liuyao, summary: { primary: '' } })).toThrow(CaseValidationError);
    expect(() => parseCaseRecord({ ...liuyao, summary: { primary: '乾', tags: ['x'.repeat(21)] } })).toThrow(
      CaseValidationError,
    );
    expect(() => parseCaseRecord({ ...liuyao, gender: '未知' })).toThrow(CaseValidationError);
    expect(() => parseCaseRecord({ ...liuyao, schema: 2 })).toThrow(CaseValidationError);
  });

  it('多余字段不会被带入库', () => {
    const parsed = parseCaseRecord({ ...liuyao, evil: 'x'.repeat(1000) }) as unknown as Record<string, unknown>;
    expect(parsed.evil).toBeUndefined();
  });
});

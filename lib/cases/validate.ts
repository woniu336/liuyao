/**
 * 卦例写入校验（服务端 fail-closed）。
 *
 * 客户端可以伪造任何 JSON；这里只接受「能由引擎复现的最小事实」，
 * 并对长度/枚举做硬约束，避免把无关大字段塞进 D1。
 */

import type { CaseInput, CaseRecord, CaseSummary } from '@/lib/store/types';

export class CaseValidationError extends Error {}

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const TIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function obj(v: unknown, field: string): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new CaseValidationError(`${field} 必须是对象`);
  return v as Record<string, unknown>;
}

function str(v: unknown, max: number, field: string, allowEmpty = true): string {
  if (typeof v !== 'string') throw new CaseValidationError(`${field} 必须是字符串`);
  const s = v.trim();
  if (!allowEmpty && !s) throw new CaseValidationError(`${field} 不能为空`);
  if (s.length > max) throw new CaseValidationError(`${field} 超过 ${max} 字`);
  return s;
}

export function parseCaseRecord(value: unknown): CaseRecord {
  const o = obj(value, 'record');

  const id = str(o.id, 64, 'id', false);
  if (!ID_RE.test(id)) throw new CaseValidationError('id 格式不合法');

  if (o.schema !== 1) throw new CaseValidationError('schema 必须为 1');

  const kind = o.kind;
  if (kind !== 'liuyao') throw new CaseValidationError('kind 不合法');

  const createdAt = str(o.createdAt, 40, 'createdAt', false);
  if (!ISO_RE.test(createdAt) || !Number.isFinite(new Date(createdAt).getTime())) {
    throw new CaseValidationError('createdAt 必须是 ISO 时间');
  }

  const timeInput = str(o.timeInput, 40, 'timeInput', false);
  if (!TIME_RE.test(timeInput)) throw new CaseValidationError('timeInput 格式应为 YYYY-MM-DDTHH:mm');

  const question = str(o.question ?? '', 2000, 'question');

  const genderRaw = o.gender;
  if (genderRaw !== undefined && genderRaw !== null && genderRaw !== '男' && genderRaw !== '女') {
    throw new CaseValidationError('gender 只能是 男/女');
  }
  const gender = genderRaw === '男' || genderRaw === '女' ? genderRaw : undefined;

  const summary = parseSummary(o.summary);
  const input = parseInput(o.input, kind);

  const favorite = o.favorite === true;

  return {
    id,
    schema: 1,
    kind,
    createdAt,
    timeInput,
    question,
    ...(gender ? { gender } : {}),
    input,
    summary,
    ...(favorite ? { favorite } : {}),
  };
}

function parseSummary(value: unknown): CaseSummary {
  const s = obj(value, 'summary');
  const primary = str(s.primary, 100, 'summary.primary', false);
  const changedRaw = s.changed;
  const changed = changedRaw === undefined || changedRaw === null ? null : str(changedRaw, 100, 'summary.changed');
  const tagsRaw = s.tags;
  let tags: string[] | undefined;
  if (tagsRaw !== undefined) {
    if (!Array.isArray(tagsRaw)) throw new CaseValidationError('summary.tags 必须是数组');
    if (tagsRaw.length > 8) throw new CaseValidationError('summary.tags 最多 8 个');
    tags = tagsRaw.map((t, i) => str(t, 20, `summary.tags[${i}]`));
  }
  return { primary, changed, ...(tags ? { tags } : {}) };
}

function parseInput(value: unknown, kind: 'liuyao'): CaseInput {
  const i = obj(value, 'input');
  if (i.kind !== kind) throw new CaseValidationError('input.kind 与 record.kind 不一致');

  const method = i.method;
  if (method !== 'coin' && method !== 'yarrow' && method !== 'manual') {
    throw new CaseValidationError('input.method 不合法');
  }
  if (!Array.isArray(i.coins) || i.coins.length !== 6) {
    throw new CaseValidationError('input.coins 必须是 6 个投掷值');
  }
  const coins = i.coins.map((c, idx) => {
    if (c !== 6 && c !== 7 && c !== 8 && c !== 9) {
      throw new CaseValidationError(`input.coins[${idx}] 必须是 6/7/8/9`);
    }
    return c as 6 | 7 | 8 | 9;
  });
  const q = str(i.question ?? '', 2000, 'input.question');
  const g = i.gender === '女' ? '女' : '男';
  return { kind, method, coins, question: q, gender: g };
}

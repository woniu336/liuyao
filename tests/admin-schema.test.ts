import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCHEMA_SQL, SCHEMA_STATEMENTS } from '../lib/admin/store/schema.generated';

/**
 * 运行时建表语句必须与 migrations/*.sql 完全同源。
 * 手工改了一边忘了另一边，测试会先红。
 */
describe('后台 schema', () => {
  it('生成物与 migrations 文件一致', () => {
    const file = readFileSync(path.resolve(__dirname, '../migrations/0001_init.sql'), 'utf8').trim();
    expect(SCHEMA_SQL).toContain(file);
    expect(SCHEMA_STATEMENTS.length).toBeGreaterThanOrEqual(4);
  });

  it('包含后台需要的四张表', () => {
    const sql = SCHEMA_SQL.toLowerCase();
    for (const table of ['settings', 'llm_profiles', 'cases', 'admin_audit']) {
      expect(sql).toContain(`create table if not exists ${table}`);
    }
    expect(sql).toContain('create index if not exists idx_cases_owner_created');
  });

  it('语句数组没有残留注释或空串', () => {
    for (const s of SCHEMA_STATEMENTS) {
      expect(s.trim()).not.toBe('');
      expect(s.trim().startsWith('--')).toBe(false);
    }
  });
});

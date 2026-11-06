#!/usr/bin/env node
/**
 * 从 migrations/*.sql 生成 lib/db/schema.generated.ts。
 *
 * 为什么要有这一步：
 *   - 迁移文件是唯一事实源（可交给 D1 CLI / 人工审阅）；
 *   - 但 Workers 运行时不能读文件，所以把 DDL 内联成常量，供本地自举建表。
 *
 *   node scripts/gen-db-schema.mjs           # 生成
 *   node scripts/gen-db-schema.mjs --check   # 只校验是否最新（CI 用）
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'migrations');
const outFile = path.join(root, 'lib', 'db', 'schema.generated.ts');

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const sql = files
  .map((f) => `-- >>> ${f}\n${fs.readFileSync(path.join(migrationsDir, f), 'utf8').trim()}`)
  .join('\n\n');

// 语句切分：本项目 DDL 不含字符串内的分号，按 ; 切即可（生成时会校验）
const statements = sql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

const body = `/* 由 scripts/gen-db-schema.mjs 生成，请勿手改。
 * 事实源：migrations/*.sql
 */

export const SCHEMA_SQL = ${JSON.stringify(sql, null, 2)};

export const SCHEMA_STATEMENTS: readonly string[] = ${JSON.stringify(statements, null, 2)};
`;

const existing = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
const changed = existing !== body;

if (process.argv.includes('--check')) {
  if (changed) {
    console.error('[check:schema] lib/db/schema.generated.ts 与 migrations/*.sql 不一致，请运行 npm run gen:schema');
    process.exit(1);
  }
  console.log('[check:schema] OK');
  process.exit(0);
}

fs.writeFileSync(outFile, body, 'utf8');
console.log(`[gen:schema] 写入 ${path.relative(root, outFile)}（${files.length} 个迁移，${statements.length} 条语句）`);

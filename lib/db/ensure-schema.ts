import { SCHEMA_STATEMENTS } from './schema.generated';
import type { D1Like } from '@/lib/admin/store/d1-types';

const ensured = new WeakSet<object>();

/**
 * D1 惰性建表（幂等）。
 *
 * 本地 miniflare 与首次部署都免手工迁移；schema 变更仍以 migrations/*.sql 为准，
 * 这里只负责「表不存在就建」。
 */
export async function ensureD1Schema(db: D1Like): Promise<void> {
  if (ensured.has(db as unknown as object)) return;
  for (const statement of SCHEMA_STATEMENTS) {
    await db.prepare(statement).run();
  }
  ensured.add(db as unknown as object);
}

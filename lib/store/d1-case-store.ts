import { ensureD1Schema } from '@/lib/db/ensure-schema';
import type { D1Like } from '@/lib/admin/store/d1-types';
import type { CaseRecord, CaseStore } from './types';

interface CaseRow {
  id: string;
  kind: string;
  created_at: string;
  time_input: string;
  question: string;
  gender: string | null;
  input_json: string;
  summary_json: string;
  favorite: number;
}

const MAX_PER_OWNER = 200;

/**
 * D1 版卦例存储（按 owner 隔离）。
 *
 * owner 来自匿名设备 Cookie，只在服务端感知；记录本身不带 owner 字段，
 * 避免客户端伪造「写到别人名下」。
 */
export class D1CaseStore implements CaseStore {
  readonly mode = 'remote' as const;

  constructor(
    private readonly db: D1Like,
    private readonly ownerId: string,
  ) {}

  private async ready(): Promise<void> {
    await ensureD1Schema(this.db);
  }

  async list(): Promise<CaseRecord[]> {
    await this.ready();
    const res = await this.db
      .prepare(
        'SELECT id, kind, created_at, time_input, question, gender, input_json, summary_json, favorite FROM cases WHERE owner_id = ? AND kind = ? ORDER BY created_at DESC LIMIT ?',
      )
      .bind(this.ownerId, 'liuyao', MAX_PER_OWNER)
      .all<CaseRow>();
    return (res.results ?? []).map(rowToRecord).filter((r): r is CaseRecord => r !== null);
  }

  async get(id: string): Promise<CaseRecord | null> {
    await this.ready();
    const row = await this.db
      .prepare(
        'SELECT id, kind, created_at, time_input, question, gender, input_json, summary_json, favorite FROM cases WHERE owner_id = ? AND id = ? AND kind = ?',
      )
      .bind(this.ownerId, id, 'liuyao')
      .first<CaseRow>();
    return row ? rowToRecord(row) : null;
  }

  async save(record: CaseRecord): Promise<void> {
    await this.ready();
    await this.db
      .prepare(
        `INSERT INTO cases (id, owner_id, kind, created_at, time_input, question, gender, input_json, summary_json, favorite)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           kind = excluded.kind, created_at = excluded.created_at, time_input = excluded.time_input,
           question = excluded.question, gender = excluded.gender, input_json = excluded.input_json,
           summary_json = excluded.summary_json, favorite = excluded.favorite
         WHERE cases.owner_id = excluded.owner_id`,
      )
      .bind(
        record.id,
        this.ownerId,
        record.kind,
        record.createdAt,
        record.timeInput,
        record.question,
        record.gender ?? null,
        JSON.stringify(record.input),
        JSON.stringify(record.summary),
        record.favorite ? 1 : 0,
      )
      .run();

    // 每个 owner 只保留最近 200 条
    await this.db
      .prepare(
        `DELETE FROM cases WHERE owner_id = ? AND id NOT IN (
           SELECT id FROM cases WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?
         )`,
      )
      .bind(this.ownerId, this.ownerId, MAX_PER_OWNER)
      .run();
  }

  async remove(id: string): Promise<void> {
    await this.ready();
    await this.db.prepare('DELETE FROM cases WHERE owner_id = ? AND id = ?').bind(this.ownerId, id).run();
  }

  async setFavorite(id: string, favorite: boolean): Promise<void> {
    await this.ready();
    await this.db
      .prepare('UPDATE cases SET favorite = ? WHERE owner_id = ? AND id = ?')
      .bind(favorite ? 1 : 0, this.ownerId, id)
      .run();
  }
}

function rowToRecord(row: CaseRow): CaseRecord | null {
  try {
    const input = JSON.parse(row.input_json);
    const summary = JSON.parse(row.summary_json);
    if (!input || typeof input !== 'object' || !summary || typeof summary !== 'object') return null;
    return {
      id: row.id,
      schema: 1,
      kind: 'liuyao',
      createdAt: row.created_at,
      timeInput: row.time_input,
      question: row.question,
      ...(row.gender === '男' || row.gender === '女' ? { gender: row.gender } : {}),
      input,
      summary,
      ...(row.favorite ? { favorite: true } : {}),
    } as CaseRecord;
  } catch {
    return null;
  }
}

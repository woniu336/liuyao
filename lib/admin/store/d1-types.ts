/**
 * 最小 D1 接口（结构化类型）。
 *
 * 不依赖 `@cloudflare/workers-types` / `.cloudflare/types` 这些生成物：
 * 生成的类型文件是 gitignore 的，fresh clone 上 tsc 不该因为缺它而失败。
 */

export interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success?: boolean;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = unknown>(): Promise<T | null>;
}

export interface D1Like {
  prepare(sql: string): D1PreparedStatement;
  batch?(statements: D1PreparedStatement[]): Promise<unknown>;
}

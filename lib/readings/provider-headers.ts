/**
 * 上游请求头（纯函数）。
 *
 * 有些网关要求额外的路由头：opencode 的 zen/go 网关在**流式**请求上强制要求
 * `x-opencode-session`，缺失直接 400 MissingSessionID。
 * 这里按 baseUrl 主机名判断，只对需要的网关附加，不影响官方 API。
 */

const SESSION_HEADER = 'x-opencode-session';

/** 进程内稳定的会话标识（同一 Worker 实例复用，便于网关侧路由） */
let stableSession: string | null = null;

export function opencodeSessionId(): string {
  if (stableSession) return stableSession;
  const fromEnv = typeof process !== 'undefined' ? process.env.OPENCODE_SESSION : undefined;
  stableSession =
    fromEnv ||
    `liuyao-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  return stableSession;
}

export function needsOpencodeSession(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname.endsWith('opencode.ai');
  } catch {
    return false;
  }
}

export function buildProviderHeaders(
  baseUrl: string,
  apiKey: string,
  sessionId: string = opencodeSessionId(),
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (needsOpencodeSession(baseUrl)) headers[SESSION_HEADER] = sessionId;
  return headers;
}

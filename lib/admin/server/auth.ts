/**
 * 后台鉴权（服务端）
 * ==================
 * - 口令来自服务端环境变量 `ADMIN_PASSWORD`，会话签名密钥 `ADMIN_SESSION_SECRET`；
 *   两者缺一即视为「后台未配置」，一律 503（fail-closed）。
 * - 会话 Cookie：HttpOnly + SameSite=Lax + HMAC-SHA256 签名 + 7 天过期。
 * - 只用 WebCrypto：Node（next dev）与 workerd 都能跑，没有 node:crypto 依赖。
 *
 * 将来接 Cloudflare Access：Access 在边缘拦住 /admin* 后，这里再加一条
 * 「信任 Cf-Access-Jwt-Assertion」的分支即可，口令分支可保留为兜底。
 */

export const ADMIN_COOKIE = 'ly_admin';
export const SESSION_TTL_SECONDS = 7 * 24 * 3600;

export interface AdminAuthConfig {
  password: string | null;
  secret: string | null;
  configured: boolean;
  /** 本地开发用了内置默认口令（生产环境不会出现） */
  devFallback: boolean;
}

function readEnv(key: string): string | undefined {
  if (typeof process === 'undefined') return undefined;
  return process.env[key];
}

function isLocalHostname(req: Request): boolean {
  try {
    const host = new URL(req.url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
}

/**
 * 后台口令配置。
 *
 * devFallback 只在**本机访问**时启用（localhost/127.0.0.1）：
 * Workers 里 `NODE_ENV` 不一定存在，不能只靠它判断环境——否则线上域名
 * 一旦忘配 ADMIN_PASSWORD，就会悄悄启用内置口令。
 */
export function adminAuthConfig(req?: Request): AdminAuthConfig {
  const password = readEnv('ADMIN_PASSWORD')?.trim() || null;
  const secret = readEnv('ADMIN_SESSION_SECRET')?.trim() || null;
  if (password || secret) {
    return { password, secret, configured: Boolean(password && secret), devFallback: false };
  }

  const isProdEnv = readEnv('NODE_ENV') === 'production';
  const allowFallback = isProdEnv ? false : req ? isLocalHostname(req) : true;
  if (allowFallback) {
    return {
      password: 'dev-admin',
      secret: 'dev-only-secret-change-me',
      configured: true,
      devFallback: true,
    };
  }

  return { password, secret, configured: false, devFallback: false };
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

async function sign(secret: string, data: string): Promise<Uint8Array> {
  const key = await hmacKey(secret);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** 常量时间比较口令（先各自 SHA-256，再逐字节异或） */
export async function verifyPassword(input: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(input)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  return equalBytes(new Uint8Array(a), new Uint8Array(b));
}

export async function createSessionToken(secret: string, ttlSeconds = SESSION_TTL_SECONDS): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await sign(secret, `admin.${exp}`);
  return `${exp}.${b64url(sig)}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const expRaw = token.slice(0, dot);
  const sigRaw = token.slice(dot + 1);
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp <= nowSeconds) return false;
  let sig: Uint8Array;
  try {
    sig = fromB64url(sigRaw);
  } catch {
    return false;
  }
  const expected = await sign(secret, `admin.${exp}`);
  return equalBytes(sig, expected);
}

export function readCookie(req: Request, name = ADMIN_COOKIE): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function cookieAttrs(req: Request, maxAge: number): string {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function sessionCookie(req: Request, token: string): string {
  return `${ADMIN_COOKIE}=${encodeURIComponent(token)}; ${cookieAttrs(req, SESSION_TTL_SECONDS)}`;
}

export function clearedSessionCookie(req: Request): string {
  return `${ADMIN_COOKIE}=; ${cookieAttrs(req, 0)}`;
}

export type AdminGuard = { ok: true; actor: string } | { ok: false; status: number; error: string };

/** 每次调用都重新读 env：配置可以在不重启的前提下由部署侧注入 */
export async function requireAdmin(req: Request): Promise<AdminGuard> {
  const cfg = adminAuthConfig(req);
  if (!cfg.configured) {
    return {
      ok: false,
      status: 503,
      error: '后台未配置：请设置服务端环境变量 ADMIN_PASSWORD 与 ADMIN_SESSION_SECRET',
    };
  }
  const token = readCookie(req);
  if (!token || !(await verifySessionToken(token, cfg.secret!))) {
    return { ok: false, status: 401, error: '未登录或会话已过期' };
  }
  return { ok: true, actor: 'admin' };
}

/**
 * 写操作的 CSRF 兜底：带 Origin 时必须与 Host 同源。
 * curl / 服务端调用没有 Origin，放行（它们本来也不带会话 Cookie）。
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get('host');
  } catch {
    return false;
  }
}

/** 登录限流：内存表，单 isolate 有效；上线后换 Cloudflare Rate Limiting */
const attempts = new Map<string, { count: number; resetAt: number }>();

export function loginRateLimited(ip: string, max = 5, windowMs = 5 * 60_000): boolean {
  const now = Date.now();
  const cur = attempts.get(ip);
  if (!cur || cur.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  cur.count += 1;
  return cur.count > max;
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}

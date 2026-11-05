/**
 * 匿名设备标识（卦例归属）。
 *
 * 不引入登录：首次访问卦例接口时下发一个 HttpOnly UUID Cookie，
 * 服务端用它做 `owner_id` 隔离。以后接账号体系时，只换 ownerId 的来源，
 * CaseStore 接口与前端都不用改。
 *
 * 边界（务必如实告知用户）：同一浏览器/同一 Cookie 才能看到同一批卦例；
 * 换设备、换浏览器或清除 Cookie 都会得到一个新的卦例夹。
 */

export const DEVICE_COOKIE = 'ly_device';
const ONE_YEAR = 365 * 24 * 3600;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export interface DeviceIdentity {
  ownerId: string;
  /** 只在新建/替换时返回，调用方负责加到响应头 */
  setCookie?: string;
}

export function getOrCreateDeviceId(req: Request): DeviceIdentity {
  const existing = readCookie(req, DEVICE_COOKIE);
  if (existing && UUID_RE.test(existing)) return { ownerId: existing };

  const ownerId = crypto.randomUUID();
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return {
    ownerId,
    setCookie: `${DEVICE_COOKIE}=${ownerId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_YEAR}${secure}`,
  };
}

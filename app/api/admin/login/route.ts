import { getAdminStore } from '@/lib/admin/store';
import {
  adminAuthConfig,
  clientIp,
  createSessionToken,
  loginRateLimited,
  sessionCookie,
  verifyPassword,
} from '@/lib/admin/server/auth';
import { adminError, adminJson, readJsonBody } from '@/lib/admin/server/http';

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (loginRateLimited(ip)) {
      return adminJson({ error: '尝试次数过多，请 5 分钟后再试' }, 429);
    }

    const cfg = adminAuthConfig(req);
    if (!cfg.configured) {
      return adminJson(
        { error: '后台未配置：请设置 ADMIN_PASSWORD 与 ADMIN_SESSION_SECRET' },
        503,
      );
    }

    const body = (await readJsonBody(req)) as { password?: unknown };
    const password = typeof body.password === 'string' ? body.password : '';
    if (!password || !(await verifyPassword(password, cfg.password!))) {
      return adminJson({ error: '口令不正确' }, 401);
    }

    const token = await createSessionToken(cfg.secret!);
    const { store } = await getAdminStore();
    await store.appendAudit('admin', 'auth.login', ip);

    return adminJson({ ok: true, actor: 'admin' }, 200, { 'Set-Cookie': sessionCookie(req, token) });
  } catch (e) {
    return adminError(e);
  }
}

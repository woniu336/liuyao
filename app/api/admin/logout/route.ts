import { getAdminStore } from '@/lib/admin/store';
import { clearedSessionCookie, requireAdmin } from '@/lib/admin/server/auth';
import { adminJson } from '@/lib/admin/server/http';

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (guard.ok) {
    const { store } = await getAdminStore();
    await store.appendAudit(guard.actor, 'auth.logout');
  }
  return adminJson({ ok: true }, 200, { 'Set-Cookie': clearedSessionCookie(req) });
}

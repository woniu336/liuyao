import { getAdminStore } from '@/lib/admin/store';
import { requireAdmin, sameOrigin } from '@/lib/admin/server/auth';
import { adminError, adminJson, readJsonBody } from '@/lib/admin/server/http';
import { parseAnnouncement } from '@/lib/admin/server/validate';
import { SETTING_ANNOUNCEMENT } from '@/lib/admin/types';

export async function PUT(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return adminJson({ error: guard.error }, guard.status);
  if (!sameOrigin(req)) return adminJson({ error: '跨源请求被拒绝' }, 403);
  try {
    const next = parseAnnouncement(await readJsonBody(req));
    const { store } = await getAdminStore();
    await store.setSetting(SETTING_ANNOUNCEMENT, next, guard.actor);
    return adminJson({ ok: true, announcement: next });
  } catch (e) {
    return adminError(e);
  }
}

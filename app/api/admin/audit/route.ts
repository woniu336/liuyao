import { getAdminStore } from '@/lib/admin/store';
import { requireAdmin } from '@/lib/admin/server/auth';
import { adminError, adminJson } from '@/lib/admin/server/http';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return adminJson({ error: guard.error }, guard.status);
  try {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') ?? 50) || 50));
    const { store } = await getAdminStore();
    return adminJson({ audit: await store.listAudit(limit) });
  } catch (e) {
    return adminError(e);
  }
}

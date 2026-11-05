import { requireAdmin } from '@/lib/admin/server/auth';
import { adminError, adminJson } from '@/lib/admin/server/http';
import { loadAdminState } from '@/lib/admin/server/state';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return adminJson({ error: guard.error }, guard.status);
  try {
    return adminJson({ state: await loadAdminState(req) });
  } catch (e) {
    return adminError(e);
  }
}

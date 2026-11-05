import { getAdminStore } from '@/lib/admin/store';
import { adminAuthConfig, requireAdmin } from '@/lib/admin/server/auth';
import { adminJson } from '@/lib/admin/server/http';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  const { mode } = await getAdminStore();
  const cfg = adminAuthConfig(req);
  return adminJson({
    authenticated: guard.ok,
    configured: cfg.configured,
    devFallback: cfg.devFallback,
    mode,
    ...(guard.ok ? {} : { reason: guard.error }),
  });
}

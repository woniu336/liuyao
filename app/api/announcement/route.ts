import { getAdminStore } from '@/lib/admin/store';
import { SETTING_ANNOUNCEMENT, publicAnnouncement, type AnnouncementSettings } from '@/lib/admin/types';

export const dynamic = 'force-dynamic';

/**
 * 公开公告接口：失败一律「没有公告」，绝不影响排盘主流程。
 * 缓存 60s，后台改完最多一分钟生效（也可在后台点「刷新」时忽略缓存）。
 */
export async function GET() {
  try {
    const { store } = await getAdminStore();
    const settings = await store.getSetting<AnnouncementSettings>(SETTING_ANNOUNCEMENT);
    const announcement = publicAnnouncement(settings);
    return Response.json(
      { announcement },
      {
        headers: {
          'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch {
    return Response.json(
      { announcement: null },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30' } },
    );
  }
}

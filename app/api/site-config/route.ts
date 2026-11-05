import { getAdminStore } from '@/lib/admin/store';
import {
  SETTING_ANALYTICS,
  SETTING_ANNOUNCEMENT,
  type AnalyticsSettings,
  type AnnouncementSettings,
} from '@/lib/admin/types';
import { publicSiteConfig } from '@/lib/site/site-config';

export const dynamic = 'force-dynamic';

/**
 * 前台公开配置：公告 + 统计。
 *
 * 页面是静态的，这里只做「小配置」：失败一律返回空配置，排盘不受影响。
 */
export async function GET() {
  try {
    const { store } = await getAdminStore();
    const [announcement, analytics] = await Promise.all([
      store.getSetting<AnnouncementSettings>(SETTING_ANNOUNCEMENT),
      store.getSetting<AnalyticsSettings>(SETTING_ANALYTICS),
    ]);
    return Response.json(publicSiteConfig(announcement, analytics), {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch {
    return Response.json(
      { announcement: null, analytics: { enabled: false, provider: 'none' } },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30' } },
    );
  }
}

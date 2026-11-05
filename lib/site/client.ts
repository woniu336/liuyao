import type { SiteConfig } from './site-config';

const EMPTY: SiteConfig = { announcement: null, analytics: { enabled: false, provider: 'none' } };

let pending: Promise<SiteConfig> | null = null;

/** 一次页面生命周期内只请求一次 /api/site-config；失败给空配置 */
export function getSiteConfig(): Promise<SiteConfig> {
  if (!pending) {
    pending = fetch('/api/site-config', { cache: 'no-store' })
      .then(async (r): Promise<SiteConfig> => (r.ok ? ((await r.json()) as SiteConfig) : EMPTY))
      .catch((): SiteConfig => EMPTY);
  }
  return pending;
}

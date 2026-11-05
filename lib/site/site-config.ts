/**
 * 站点级公开配置（公告 + 统计）：纯函数，客户端与服务端共用。
 *
 * 只暴露「写进 HTML 也无所谓」的字段：公告文本、统计 token/siteId。
 * 不含任何 LLM 配置、密钥、后台路径信息。
 */

import type { AnalyticsProvider, AnalyticsSettings, AnnouncementSettings } from '@/lib/admin/types';
import { publicAnnouncement } from '@/lib/admin/types';

export interface PublicAnalytics {
  enabled: boolean;
  provider: AnalyticsProvider;
  token?: string;
  siteId?: string;
  scriptUrl?: string;
}

export interface SiteConfig {
  announcement: ReturnType<typeof publicAnnouncement>;
  analytics: PublicAnalytics;
}

export function publicSiteConfig(
  announcement: AnnouncementSettings | null,
  analytics: AnalyticsSettings | null,
  now = new Date(),
): SiteConfig {
  const a = publicAnnouncement(announcement, now);
  const enabled = Boolean(analytics?.enabled && analytics.provider !== 'none');
  return {
    announcement: a,
    analytics: enabled
      ? {
          enabled: true,
          provider: analytics!.provider,
          ...(analytics!.token ? { token: analytics!.token } : {}),
          ...(analytics!.siteId ? { siteId: analytics!.siteId } : {}),
          ...(analytics!.scriptUrl ? { scriptUrl: analytics!.scriptUrl } : {}),
        }
      : { enabled: false, provider: 'none' },
  };
}

export interface AnalyticsScript {
  src: string;
  attrs: Record<string, string>;
}

/**
 * 结构化配置 → 一段可注入的脚本描述。
 * 只接受已知 provider 与 https 地址；任何不完整/不合法都返回 null（宁可不统计）。
 */
export function analyticsScript(settings: PublicAnalytics | null | undefined): AnalyticsScript | null {
  if (!settings?.enabled) return null;
  const isHttps = (u?: string) => Boolean(u && /^https:\/\/[^\s"'<>]+$/.test(u));

  if (settings.provider === 'cloudflare') {
    if (!settings.token) return null;
    return {
      src: 'https://static.cloudflareinsights.com/beacon.min.js',
      attrs: { 'data-cf-beacon': JSON.stringify({ token: settings.token }) },
    };
  }

  if (settings.provider === 'umami') {
    if (!settings.siteId || !isHttps(settings.scriptUrl)) return null;
    return { src: settings.scriptUrl!, attrs: { 'data-website-id': settings.siteId } };
  }

  if (settings.provider === 'plausible') {
    if (!settings.siteId) return null;
    const src = settings.scriptUrl || 'https://plausible.io/js/script.js';
    if (!isHttps(src)) return null;
    return { src, attrs: { 'data-domain': settings.siteId } };
  }

  return null;
}

export const ANNOUNCEMENT_DISMISS_KEY = 'liuyao.announcement.dismissed';

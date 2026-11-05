import { describe, expect, it } from 'vitest';
import { DEFAULT_ANALYTICS, DEFAULT_ANNOUNCEMENT, type AnalyticsSettings } from '../lib/admin/types';
import { analyticsScript, publicSiteConfig } from '../lib/site/site-config';

const now = new Date('2026-11-05T12:00:00');
const baseAnnouncement = { ...DEFAULT_ANNOUNCEMENT, enabled: true, text: '今晚维护', updatedAt: '2026-11-05T10:00:00.000Z' };

function analytics(patch: Partial<AnalyticsSettings>): AnalyticsSettings {
  return { ...DEFAULT_ANALYTICS, enabled: true, provider: 'cloudflare', token: 'tok', updatedAt: '', ...patch };
}

describe('站点公开配置', () => {
  it('公告未启用 / 未生效时为 null', () => {
    expect(publicSiteConfig(null, null, now).announcement).toBeNull();
    expect(publicSiteConfig({ ...baseAnnouncement, enabled: false }, null, now).announcement).toBeNull();
    expect(
      publicSiteConfig({ ...baseAnnouncement, startsAt: '2026-11-06T00:00' }, null, now).announcement,
    ).toBeNull();
  });

  it('公告生效时只带展示字段', () => {
    const cfg = publicSiteConfig(baseAnnouncement, null, now);
    expect(cfg.announcement).toEqual(
      expect.objectContaining({ level: 'info', text: '今晚维护', updatedAt: baseAnnouncement.updatedAt }),
    );
  });

  it('统计未启用时不暴露 token/siteId', () => {
    const cfg = publicSiteConfig(null, { ...analytics({}), enabled: false }, now);
    expect(cfg.analytics).toEqual({ enabled: false, provider: 'none' });
    const none = publicSiteConfig(null, analytics({ provider: 'none' }), now);
    expect(none.analytics.enabled).toBe(false);
  });

  it('统计启用时只暴露公开字段', () => {
    const cfg = publicSiteConfig(null, analytics({}), now);
    expect(cfg.analytics).toEqual({ enabled: true, provider: 'cloudflare', token: 'tok' });
  });
});

describe('统计脚本描述', () => {
  it('cloudflare：beacon + token', () => {
    const s = analyticsScript({ enabled: true, provider: 'cloudflare', token: 'abc' });
    expect(s?.src).toBe('https://static.cloudflareinsights.com/beacon.min.js');
    expect(JSON.parse(s!.attrs['data-cf-beacon'])).toEqual({ token: 'abc' });
  });

  it('umami：必须 https 脚本 + siteId', () => {
    expect(analyticsScript({ enabled: true, provider: 'umami', siteId: 's1' })).toBeNull();
    expect(analyticsScript({ enabled: true, provider: 'umami', siteId: 's1', scriptUrl: 'http://x.test/a.js' })).toBeNull();
    const s = analyticsScript({ enabled: true, provider: 'umami', siteId: 's1', scriptUrl: 'https://u.test/a.js' });
    expect(s).toEqual({ src: 'https://u.test/a.js', attrs: { 'data-website-id': 's1' } });
  });

  it('plausible：默认脚本地址，可覆盖', () => {
    expect(analyticsScript({ enabled: true, provider: 'plausible', siteId: 'd.test' })).toEqual({
      src: 'https://plausible.io/js/script.js',
      attrs: { 'data-domain': 'd.test' },
    });
    expect(
      analyticsScript({ enabled: true, provider: 'plausible', siteId: 'd.test', scriptUrl: 'https://p.test/js' })?.src,
    ).toBe('https://p.test/js');
  });

  it('未启用 / 信息不全 / 非法地址：一律不注入', () => {
    expect(analyticsScript(null)).toBeNull();
    expect(analyticsScript({ enabled: false, provider: 'cloudflare', token: 'x' })).toBeNull();
    expect(analyticsScript({ enabled: true, provider: 'cloudflare' })).toBeNull();
    expect(analyticsScript({ enabled: true, provider: 'plausible' })).toBeNull();
    expect(analyticsScript({ enabled: true, provider: 'umami', siteId: 's', scriptUrl: 'javascript:alert(1)' })).toBeNull();
  });

  it('输出里不含后台/密钥字段', () => {
    const s = analyticsScript({ enabled: true, provider: 'cloudflare', token: 'abc' });
    const text = JSON.stringify(s);
    expect(text).not.toMatch(/admin|password|secret|api[_-]?key/i);
  });
});

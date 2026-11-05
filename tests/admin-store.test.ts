import { describe, expect, it } from 'vitest';
import { MemoryAdminStore } from '../lib/admin/store';
import {
  announcementActive,
  publicAnnouncement,
  DEFAULT_ANNOUNCEMENT,
  type AnnouncementSettings,
  type LlmProfile,
} from '../lib/admin/types';
import { AdminValidationError, parseAnalytics, parseAnnouncement, parseProfile } from '../lib/admin/server/validate';

const profile = (id: string, sort = 0): LlmProfile => ({
  id,
  label: `L-${id}`,
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  keyEnv: 'LLM_API_KEY',
  enabled: true,
  sort,
  updatedAt: new Date().toISOString(),
});

describe('后台存储（内存实现）', () => {
  it('settings 读写 + JSON 往返', async () => {
    const store = new MemoryAdminStore();
    await store.setSetting('announcement', { enabled: true, text: 'hi' }, 'admin');
    expect(await store.getSetting('announcement')).toEqual({ enabled: true, text: 'hi' });
    expect(await store.getSetting('missing')).toBeNull();
  });

  it('profile 排序、覆盖、删除', async () => {
    const store = new MemoryAdminStore();
    await store.upsertProfile(profile('b', 2), 'admin');
    await store.upsertProfile(profile('a', 1), 'admin');
    expect((await store.listProfiles()).map((p) => p.id)).toEqual(['a', 'b']);

    await store.upsertProfile({ ...profile('a', 1), label: 'changed' }, 'admin');
    expect((await store.listProfiles()).find((p) => p.id === 'a')?.label).toBe('changed');

    await store.deleteProfile('a', 'admin');
    expect((await store.listProfiles()).map((p) => p.id)).toEqual(['b']);
  });

  it('写操作自带审计，按时间倒序、可限流', async () => {
    const store = new MemoryAdminStore();
    await store.setSetting('k1', 1, 'admin');
    await store.upsertProfile(profile('a'), 'admin');
    const audit = await store.listAudit(10);
    expect(audit.map((a) => a.action)).toEqual(['llm.profile.upsert', 'setting.k1']);
    expect(audit[0].actor).toBe('admin');
    expect(await store.listAudit(1)).toHaveLength(1);
  });
});

describe('公告生效窗口', () => {
  const base: AnnouncementSettings = { ...DEFAULT_ANNOUNCEMENT, enabled: true, text: '系统维护', updatedAt: '' };

  it('启停 / 空文本', () => {
    expect(announcementActive(base)).toBe(true);
    expect(announcementActive({ ...base, enabled: false })).toBe(false);
    expect(announcementActive({ ...base, text: '   ' })).toBe(false);
    expect(announcementActive(null)).toBe(false);
  });

  it('起止时间窗', () => {
    const now = new Date('2026-11-05T12:00:00');
    expect(announcementActive({ ...base, startsAt: '2026-11-05T13:00:00' }, now)).toBe(false);
    expect(announcementActive({ ...base, endsAt: '2026-11-05T11:00:00' }, now)).toBe(false);
    expect(announcementActive({ ...base, startsAt: '2026-11-05T11:00:00', endsAt: '2026-11-05T13:00:00' }, now)).toBe(true);
  });

  it('对外只暴露展示字段', () => {
    const pub = publicAnnouncement({ ...base, enabled: true });
    expect(pub).toEqual(
      expect.objectContaining({ level: 'info', text: '系统维护' }),
    );
    expect(publicAnnouncement({ ...base, enabled: false })).toBeNull();
  });
});

describe('后台输入校验（fail-closed）', () => {
  it('公告', () => {
    expect(() => parseAnnouncement({ enabled: true, text: '' })).toThrow(AdminValidationError);
    expect(() => parseAnnouncement({ level: 'oops', text: 'x' })).toThrow(AdminValidationError);
    expect(() => parseAnnouncement({ text: 'x'.repeat(2001) })).toThrow(AdminValidationError);
    const ok = parseAnnouncement({ enabled: true, text: '维护', level: 'warn', startsAt: '2026-11-05T12:00' });
    expect(ok).toMatchObject({ enabled: true, level: 'warn', text: '维护', startsAt: '2026-11-05T12:00' });
    expect(ok.updatedAt).toBeTruthy();
  });

  it('统计配置', () => {
    expect(() => parseAnalytics({ enabled: true, provider: 'none' })).toThrow(AdminValidationError);
    expect(() => parseAnalytics({ enabled: true, provider: 'cloudflare' })).toThrow(AdminValidationError);
    expect(() => parseAnalytics({ enabled: false, provider: 'umami', scriptUrl: 'http://x.test/a.js' })).toThrow(
      AdminValidationError,
    );
    const ok = parseAnalytics({ enabled: true, provider: 'cloudflare', token: 'abc' });
    expect(ok).toMatchObject({ enabled: true, provider: 'cloudflare', token: 'abc' });
  });

  it('LLM profile', () => {
    const valid = {
      label: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/',
      model: 'deepseek-chat',
      keyEnv: 'LLM_API_KEY',
    };
    const p = parseProfile(valid);
    expect(p.baseUrl).toBe('https://api.deepseek.com');
    expect(p.id).toMatch(/^deepseek-[a-z0-9]{4}$/);
    expect(p.thinking).toBe('default');
    expect(p.reasoningEffort).toBeUndefined();

    const withThinking = parseProfile({ ...valid, thinking: 'enabled', reasoningEffort: 'high' });
    expect(withThinking.thinking).toBe('enabled');
    expect(withThinking.reasoningEffort).toBe('high');

    const bogus = parseProfile({ ...valid, thinking: 'maybe', reasoningEffort: 'ultra' });
    expect(bogus.thinking).toBe('default');
    expect(bogus.reasoningEffort).toBeUndefined();

    expect(() => parseProfile({ ...valid, baseUrl: 'http://api.deepseek.com' })).toThrow(AdminValidationError);
    expect(() => parseProfile({ ...valid, baseUrl: 'http://localhost:4010/' })).not.toThrow();
    expect(() => parseProfile({ ...valid, keyEnv: 'llm_key' })).toThrow(AdminValidationError);
    expect(() => parseProfile({ ...valid, label: '' })).toThrow(AdminValidationError);
  });
});

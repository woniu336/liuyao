/**
 * 后台输入的 fail-closed 校验：宁可 400，也不把半截脏数据写进库。
 */

import type {
  AnalyticsSettings,
  AnalyticsProvider,
  AnnouncementLevel,
  AnnouncementSettings,
  LlmProfile,
} from '../types';

export class AdminValidationError extends Error {}

const LEVELS: AnnouncementLevel[] = ['info', 'warn', 'danger'];
const PROVIDERS: AnalyticsProvider[] = ['none', 'cloudflare', 'umami', 'plausible'];

function str(v: unknown, max: number, field: string): string {
  if (typeof v !== 'string') throw new AdminValidationError(`${field} 必须是字符串`);
  const s = v.trim();
  if (s.length > max) throw new AdminValidationError(`${field} 超过 ${max} 字`);
  return s;
}

function optionalTime(v: unknown, field: string): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw new AdminValidationError(`${field} 必须是时间字符串`);
  const s = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?/.test(s)) {
    throw new AdminValidationError(`${field} 格式应为 YYYY-MM-DDTHH:mm`);
  }
  if (!Number.isFinite(new Date(s).getTime())) throw new AdminValidationError(`${field} 不是合法时间`);
  return s;
}

export function parseAnnouncement(input: unknown): AnnouncementSettings {
  const o = (input ?? {}) as Record<string, unknown>;
  const text = str(o.text ?? '', 2000, '公告正文');
  const level = LEVELS.includes(o.level as AnnouncementLevel) ? (o.level as AnnouncementLevel) : 'info';
  if (o.level !== undefined && !LEVELS.includes(o.level as AnnouncementLevel)) {
    throw new AdminValidationError('公告级别只能是 info / warn / danger');
  }
  if (o.enabled === true && !text) {
    throw new AdminValidationError('公告已启用但正文为空');
  }
  return {
    enabled: o.enabled === true,
    level,
    text,
    startsAt: optionalTime(o.startsAt, '开始时间'),
    endsAt: optionalTime(o.endsAt, '结束时间'),
    updatedAt: new Date().toISOString(),
  };
}

export function parseAnalytics(input: unknown): AnalyticsSettings {
  const o = (input ?? {}) as Record<string, unknown>;
  const provider = o.provider === undefined ? 'none' : (o.provider as AnalyticsProvider);
  if (!PROVIDERS.includes(provider)) throw new AdminValidationError('统计服务商不合法');

  const token = o.token === undefined || o.token === null ? '' : str(o.token, 200, 'token');
  const siteId = o.siteId === undefined || o.siteId === null ? '' : str(o.siteId, 120, 'siteId');
  const scriptUrl = o.scriptUrl === undefined || o.scriptUrl === null ? '' : str(o.scriptUrl, 400, '脚本地址');

  if (scriptUrl && !/^https:\/\//.test(scriptUrl)) {
    throw new AdminValidationError('脚本地址必须是 https://');
  }
  if (o.enabled === true) {
    if (provider === 'none') throw new AdminValidationError('启用统计前请选择服务商');
    if (provider === 'cloudflare' && !token) throw new AdminValidationError('Cloudflare Web Analytics 需要 token');
    if ((provider === 'umami' || provider === 'plausible') && !siteId) {
      throw new AdminValidationError('自建统计需要 siteId');
    }
    if (provider === 'umami' && !scriptUrl) throw new AdminValidationError('umami 需要脚本地址');
  }

  return {
    enabled: o.enabled === true,
    provider,
    token,
    siteId,
    scriptUrl,
    updatedAt: new Date().toISOString(),
  };
}

export function parseProfile(input: unknown): LlmProfile {
  const o = (input ?? {}) as Record<string, unknown>;
  const label = str(o.label ?? '', 40, '名称');
  const baseUrl = str(o.baseUrl ?? '', 300, 'Base URL');
  const model = str(o.model ?? '', 80, '模型名');
  const keyEnv = str(o.keyEnv ?? '', 60, '密钥变量名');

  if (!label) throw new AdminValidationError('名称不能为空');
  if (!model) throw new AdminValidationError('模型名不能为空');
  if (!/^https:\/\//.test(baseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(baseUrl)) {
    throw new AdminValidationError('Base URL 必须是 https（本机调试可用 http://localhost）');
  }
  if (!/^[A-Z][A-Z0-9_]*$/.test(keyEnv)) {
    throw new AdminValidationError('密钥变量名需形如 LLM_API_KEY（大写字母/数字/下划线）');
  }

  let id = typeof o.id === 'string' ? o.id.trim() : '';
  if (id && !/^[a-z0-9][a-z0-9_-]{1,40}$/.test(id)) {
    throw new AdminValidationError('id 只能是小写字母/数字/短横线');
  }
  if (!id) {
    const slug = (o.idHint as string) || label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    id = `${slug || 'profile'}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 42);
  }

  const sortRaw = Number(o.sort ?? 0);
  return {
    id,
    label,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    model,
    keyEnv,
    enabled: o.enabled !== false,
    sort: Number.isFinite(sortRaw) ? Math.max(0, Math.min(999, Math.trunc(sortRaw))) : 0,
    updatedAt: new Date().toISOString(),
  };
}

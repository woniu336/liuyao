/**
 * 后台/共享状态的类型与默认值（客户端与服务端共用，不含任何密钥）。
 */

export type AnnouncementLevel = 'info' | 'warn' | 'danger';

export interface AnnouncementSettings {
  enabled: boolean;
  level: AnnouncementLevel;
  text: string;
  /** ISO 或 datetime-local；为空表示不限制 */
  startsAt?: string | null;
  endsAt?: string | null;
  /** 服务端写入 */
  updatedAt: string;
}

export type AnalyticsProvider = 'none' | 'cloudflare' | 'umami' | 'plausible';

export interface AnalyticsSettings {
  enabled: boolean;
  provider: AnalyticsProvider;
  /** Cloudflare Web Analytics token / umbrella/plausible 的站点标识 */
  token?: string;
  siteId?: string;
  /** 自建 umami 时的脚本地址（https） */
  scriptUrl?: string;
  updatedAt: string;
}

export interface LlmProfile {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  /** 密钥所在的**环境变量名**，密钥本身永不入库 */
  keyEnv: string;
  enabled: boolean;
  sort: number;
  updatedAt: string;
}

export interface AuditEntry {
  id: number;
  at: string;
  actor: string;
  action: string;
  detail: string | null;
}

export interface AdminState {
  mode: 'd1' | 'memory';
  auth: { configured: boolean; mode: 'password'; devFallback: boolean };
  announcement: AnnouncementSettings;
  analytics: AnalyticsSettings;
  profiles: LlmProfile[];
  activeProfileId: string | null;
  audit: AuditEntry[];
}

export const SETTING_ANNOUNCEMENT = 'announcement';
export const SETTING_ANALYTICS = 'analytics';
export const SETTING_LLM_ACTIVE = 'llm_active_id';

export const DEFAULT_ANNOUNCEMENT: AnnouncementSettings = {
  enabled: false,
  level: 'info',
  text: '',
  startsAt: null,
  endsAt: null,
  updatedAt: '',
};

export const DEFAULT_ANALYTICS: AnalyticsSettings = {
  enabled: false,
  provider: 'none',
  updatedAt: '',
};

/** 公告是否此刻生效（启停 + 文本 + 起止时间窗） */
export function announcementActive(a: AnnouncementSettings | null, now = new Date()): boolean {
  if (!a || !a.enabled || !a.text.trim()) return false;
  const t = now.getTime();
  if (a.startsAt) {
    const start = new Date(a.startsAt).getTime();
    if (Number.isFinite(start) && start > t) return false;
  }
  if (a.endsAt) {
    const end = new Date(a.endsAt).getTime();
    if (Number.isFinite(end) && end < t) return false;
  }
  return true;
}

/** 对外只暴露公告的展示字段 */
export function publicAnnouncement(a: AnnouncementSettings | null, now = new Date()) {
  if (!announcementActive(a, now)) return null;
  return {
    level: a!.level,
    text: a!.text,
    startsAt: a!.startsAt ?? null,
    endsAt: a!.endsAt ?? null,
    updatedAt: a!.updatedAt,
  };
}

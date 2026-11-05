import { getAdminStore } from '../store';
import { adminAuthConfig } from './auth';
import {
  DEFAULT_ANALYTICS,
  DEFAULT_ANNOUNCEMENT,
  SETTING_ANALYTICS,
  SETTING_ANNOUNCEMENT,
  SETTING_LLM_ACTIVE,
  type AdminState,
  type AnalyticsSettings,
  type AnnouncementSettings,
} from '../types';

/** 组装后台一次性快照（不含任何密钥） */
export async function loadAdminState(req?: Request): Promise<AdminState> {
  const { store, mode } = await getAdminStore();
  const [announcement, analytics, profiles, activeProfileId, audit] = await Promise.all([
    store.getSetting<AnnouncementSettings>(SETTING_ANNOUNCEMENT),
    store.getSetting<AnalyticsSettings>(SETTING_ANALYTICS),
    store.listProfiles(),
    store.getSetting<string>(SETTING_LLM_ACTIVE),
    store.listAudit(50),
  ]);

  const cfg = adminAuthConfig(req);
  return {
    mode,
    auth: { configured: cfg.configured, mode: 'password', devFallback: cfg.devFallback },
    announcement: announcement ?? DEFAULT_ANNOUNCEMENT,
    analytics: analytics ?? DEFAULT_ANALYTICS,
    profiles,
    activeProfileId: activeProfileId ?? null,
    audit,
  };
}

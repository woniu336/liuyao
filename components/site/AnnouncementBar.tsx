'use client';

/**
 * 全站公告条。
 *
 * - 页面是静态的：公告在客户端拉 `/api/site-config`，后台改完最多 60s 生效；
 * - 接口失败 = 不显示，绝不影响排盘；
 * - 「关闭」按 `updatedAt` 记忆：同一条公告不再打扰，后台更新后重新出现。
 */

import React, { useEffect, useState } from 'react';
import { getSiteConfig } from '@/lib/site/client';
import { ANNOUNCEMENT_DISMISS_KEY, type SiteConfig } from '@/lib/site/site-config';

type Announcement = NonNullable<SiteConfig['announcement']>;

const LEVEL_STYLE: Record<Announcement['level'], string> = {
  info: 'border-[#C8D6C6] bg-[#F2F7F0] text-[#3F5B4B]',
  warn: 'border-[#E0CDB2] bg-[#FBF6EC] text-[#7C6A45]',
  danger: 'border-[#D9A99F] bg-[#FDF2EF] text-[#8E3A2C]',
};

const LEVEL_LABEL: Record<Announcement['level'], string> = {
  info: '公告',
  warn: '注意',
  danger: '重要',
};

export default function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    void getSiteConfig().then((cfg) => {
      if (!alive) return;
      const a = cfg.announcement;
      setAnnouncement(a);
      if (a) {
        try {
          if (window.localStorage.getItem(ANNOUNCEMENT_DISMISS_KEY) === a.updatedAt) setDismissed(true);
        } catch {
          /* 隐私模式：照常显示 */
        }
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!announcement || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(ANNOUNCEMENT_DISMISS_KEY, announcement.updatedAt);
    } catch {
      /* 忽略 */
    }
  };

  return (
    <div role="status" aria-live="polite" className={`border-b px-3 py-2 font-serif ${LEVEL_STYLE[announcement.level]}`}>
      <div className="mx-auto flex max-w-[860px] items-start justify-center gap-2 text-[12px] leading-relaxed">
        <span className="mt-[1px] shrink-0 rounded-[2px] border border-current/30 px-1.5 py-[1px] text-[10px] tracking-[0.06em] opacity-90">
          {LEVEL_LABEL[announcement.level]}
        </span>
        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-center">{announcement.text}</p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="关闭公告"
          className="shrink-0 cursor-pointer rounded-[2px] px-1.5 py-[1px] text-[13px] leading-none opacity-60 transition-opacity hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}

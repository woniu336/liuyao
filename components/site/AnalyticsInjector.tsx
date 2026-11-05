'use client';

/**
 * 统计脚本注入（结构化配置，不做任意 JS snippet）。
 *
 * 页面保持静态：配置从 `/api/site-config` 拉，运行时创建 <script>。
 * 只允许 https、只认白名单 provider；字段不完整就不注入。
 */

import { useEffect } from 'react';
import { getSiteConfig } from '@/lib/site/client';
import { analyticsScript } from '@/lib/site/site-config';

const MARKER = 'data-liuyao-analytics';

export default function AnalyticsInjector() {
  useEffect(() => {
    let alive = true;
    void getSiteConfig().then((cfg) => {
      if (!alive) return;
      const desc = analyticsScript(cfg.analytics);
      if (!desc) return;
      if (document.querySelector(`script[${MARKER}]`)) return;

      const s = document.createElement('script');
      s.src = desc.src;
      s.async = true;
      s.defer = true;
      s.setAttribute(MARKER, desc.attrs['data-cf-beacon'] ? 'cloudflare' : cfg.analytics.provider);
      for (const [k, v] of Object.entries(desc.attrs)) s.setAttribute(k, v);
      document.head.appendChild(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  return null;
}

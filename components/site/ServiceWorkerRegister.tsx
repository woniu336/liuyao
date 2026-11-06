'use client';

/**
 * 注册 Service Worker。
 *
 * 只在**非本机域名**上注册：本地（localhost / 127.0.0.1 / *.local）改代码时，
 * SW 缓存会把旧 chunk 留在浏览器里，排查问题很费劲；若之前装过，这里顺手注销。
 */
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const host = window.location.hostname;
    const isLocal =
      host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]' || host.endsWith('.local');
    if (isLocal) {
      void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
      return;
    }

    const register = () => {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* 隐私模式或浏览器禁用：不影响正常使用 */
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}

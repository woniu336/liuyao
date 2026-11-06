/* 野鹤六爻 · Service Worker
 * ==========================
 * 目标只有一个：装到主屏后，起卦与排盘能离线跑（这两步全是本地计算）。
 *
 * 策略：
 *   - 导航请求：network-first，断网回落缓存里的 `/`（离线壳）
 *   - 静态资源（/_next/static、/icons、/images、/fonts、/data）：cache-first + 后台更新
 *   - /api/*：一律直连，不缓存（解卦是流式、历史排盘要实时）
 *   - 其它同源 GET：network-first，失败回落缓存
 *
 * 版本号改动即触发更新；旧缓存在 activate 时清掉。
 */

const VERSION = 'yehe-v1';
const SHELL = [
  '/',
  '/examples',
  '/cases',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      // 单个失败不影响整体安装（例如某页临时 500）
      await Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

const STATIC_PREFIX = ['/_next/static/', '/icons/', '/images/', '/fonts/', '/data/'];

function isStatic(url) {
  return STATIC_PREFIX.some((p) => url.pathname.startsWith(p));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // 接口直连
  if (url.pathname === '/sw.js') return;

  // 页面导航：先网后缓存
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(VERSION);
          cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cache = await caches.open(VERSION);
          const hit = (await cache.match(req)) || (await cache.match('/'));
          return hit || new Response('离线中，且没有可用的缓存页面。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }
      })(),
    );
    return;
  }

  // 静态资源：缓存优先，后台补新
  if (isStatic(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        const hit = await cache.match(req);
        if (hit) {
          fetch(req)
            .then((fresh) => {
              if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
            })
            .catch(() => {});
          return hit;
        }
        try {
          const fresh = await fetch(req);
          if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          return new Response('', { status: 504 });
        }
      })(),
    );
    return;
  }

  // 其它：先网后缓存
  event.respondWith(
    (async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(VERSION);
        const hit = await cache.match(req);
        return hit || new Response('', { status: 504 });
      }
    })(),
  );
});

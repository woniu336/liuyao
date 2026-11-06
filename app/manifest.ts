import type { MetadataRoute } from 'next';

/**
 * PWA 清单：不加应用商店，直接用「添加到主屏」的安装体验。
 * 图标由 app/icon.svg 渲染而来（public/icons/*），display: standalone 让打开后没有地址栏。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '野鹤六爻',
    short_name: '野鹤六爻',
    description: '三钱摇卦与纳甲排盘：确定性排盘、四段解读，可离线起卦。',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'zh-CN',
    dir: 'ltr',
    background_color: '#F7F4EF',
    theme_color: '#F7F4EF',
    categories: ['lifestyle', 'education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: '案例', short_name: '案例', url: '/examples' },
      { name: '历史排盘', short_name: '历史', url: '/cases' },
    ],
  };
}

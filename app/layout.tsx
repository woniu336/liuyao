import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegister from '@/components/site/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: '野鹤六爻 | 确定性排盘',
  description:
    '三钱摇卦与纳甲排盘，排盘由确定性引擎计算，解读依盘面事实展开；易学典籍将逐步整理校核。',
  applicationName: '野鹤六爻',
  appleWebApp: {
    capable: true,
    title: '野鹤六爻',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F7F4EF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="flex min-h-full flex-col bg-[#F4F1E8] text-[#38423C] antialiased">
        <main className="flex flex-1 flex-col">{children}</main>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

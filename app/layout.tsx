import type { Metadata } from 'next';
import './globals.css';
import AnnouncementBar from '@/components/site/AnnouncementBar';
import AnalyticsInjector from '@/components/site/AnalyticsInjector';

export const metadata: Metadata = {
  title: '易林寻踪 | 六爻 · 小成图',
  description:
    '三钱摇卦、纳甲排盘与小成图九宫解盘。排盘由确定性引擎计算，解读依盘面事实展开；易学典籍将逐步整理校核。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="flex min-h-full flex-col bg-[#F4F1E8] text-[#38423C] antialiased">
        <AnnouncementBar />
        <main className="flex flex-1 flex-col">{children}</main>
        <AnalyticsInjector />
      </body>
    </html>
  );
}

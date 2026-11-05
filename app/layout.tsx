import type { Metadata } from 'next';
import './globals.css';
import AnnouncementBar from '@/components/site/AnnouncementBar';
import AnalyticsInjector from '@/components/site/AnalyticsInjector';

export const metadata: Metadata = {
  title: '六爻 · 小成图 | 确定性排盘',
  description:
    '六爻纳甲确定性排盘（纳甲装卦、安世应、定六亲、旬空、伏神、天医文昌神煞）与霍氏小成图九宫排盘（四象八断、正推气路）。不含意图推断与大模型解卦。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="flex min-h-full flex-col bg-[#f7f3ea] text-[#22201b] antialiased">
        <AnnouncementBar />
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-[#E4DCCB] px-4 py-6 text-center font-serif text-[10.5px] leading-relaxed text-[#8c8272]">
          六爻 · 小成图 —— 仅做确定性排盘：不取用神、不判吉凶、不调大模型
          <br />
          排盘逻辑移植自 bazi-web（六爻 core.py / 小成图 lib/xct），已裁剪意图引擎与五层 DAG
        </footer>
        <AnalyticsInjector />
      </body>
    </html>
  );
}

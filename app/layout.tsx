import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '野鹤六爻 | 确定性排盘',
  description:
    '三钱摇卦与纳甲排盘，排盘由确定性引擎计算，解读依盘面事实展开；易学典籍将逐步整理校核。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="flex min-h-full flex-col bg-[#F4F1E8] text-[#38423C] antialiased">
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}

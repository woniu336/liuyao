import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '关于 | 六爻' };

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F4F1E8] px-4 py-16 text-[#38423C] sm:px-7">
      <div className="mx-auto max-w-[680px]">
        <Link href="/" className="font-song text-[12px] text-[#756E5F] underline-offset-4 hover:underline">← 返回起卦</Link>
        <h1 className="mt-8 font-song text-[30px] font-semibold tracking-[0.16em] text-[#304239]">关于</h1>
        <div className="mt-5 space-y-4 font-song text-[14px] leading-[2] text-[#5D6259]">
          <p>这是一个以确定性排盘为基础的六爻与小成图工具。</p>
          <p>排盘由程序计算；解读是模型基于盘面事实给出的参考，不替代现实中的专业判断。</p>
          <p>易学典籍页将逐步整理周易经传与相关文献，原文、版本与出处会尽量注明。</p>
        </div>
      </div>
    </main>
  );
}

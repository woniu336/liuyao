import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '易学典籍 | 六爻',
  description: '周易经传与易学文献的阅读入口；原文与来源校核后逐步整理。',
};

const shelves = [
  { title: '《周易》', subtitle: '六十四卦 · 卦辞 · 爻辞', status: '待校录' },
  { title: '十翼', subtitle: '彖传 · 象传 · 系辞 · 说卦', status: '待校录' },
  { title: '象数易学', subtitle: '先后天八卦 · 河洛 · 小成图', status: '整理中' },
  { title: '六爻古籍', subtitle: '卜筮正宗 · 增删卜易 · 古筮真诠', status: '待校录' },
];

export default function ClassicsPage() {
  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#38423C]">
      <header className="border-b border-[#C8BEA8]/60 bg-[#F6F2E9]/90">
        <div className="mx-auto flex h-[58px] max-w-[1120px] items-center justify-between px-4 sm:px-7 lg:px-10">
          <Link href="/" className="flex items-center gap-3 text-[#35443D]">
            <span className="flex h-9 w-9 items-center justify-center border border-[#9A7040] font-song text-[20px] text-[#8E6337]" style={{ borderRadius: 3 }}>易</span>
            <span className="font-song text-[20px] font-semibold tracking-[0.12em]">六爻</span>
          </Link>
          <nav className="flex items-center gap-3 font-song text-[12px] text-[#625E52] sm:gap-6 sm:text-[14px]">
            <Link href="/" className="hover:text-[#8E6337]">起卦</Link>
            <Link href="/cases" className="hover:text-[#8E6337]">卦例</Link>
            <Link href="/classics" className="border-b border-[#49675B] pb-1 font-medium text-[#34483E]">易学典籍</Link>
            <Link href="/about" className="hidden hover:text-[#8E6337] sm:inline">关于</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[920px] px-4 pb-20 pt-14 sm:px-7 sm:pt-20">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center gap-3 font-kai text-[11px] tracking-[0.28em] text-[#98784A]">
            <span className="h-px w-8 bg-[#B89C6C]/70" />
            观象 · 寻源 · 校文
            <span className="h-px w-8 bg-[#B89C6C]/70" />
          </div>
          <h1 className="font-song text-[30px] font-semibold tracking-[0.18em] text-[#304239] sm:text-[34px]">易学典籍</h1>
          <p className="mx-auto mt-3 max-w-[620px] font-song text-[13px] leading-[2] tracking-[0.04em] text-[#756E5F]">
            周易经传与象数文献的阅读空间。原文、版本与出处校核后再入库，不以模型转述代替原典。
          </p>
        </div>

        <div className="mt-10 grid gap-x-5 gap-y-1 sm:grid-cols-2">
          {shelves.map((s, i) => (
            <section key={s.title} className="group border-b border-[#D8D0BE] px-2 py-5 sm:px-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-kai text-[11px] text-[#B49B6B]">{String(i + 1).padStart(2, '0')}</span>
                  <h2 className="font-song text-[18px] font-semibold tracking-[0.06em] text-[#35443D]">{s.title}</h2>
                </div>
                <span className="font-kai text-[10.5px] text-[#A4977E]">{s.status}</span>
              </div>
              <p className="mt-2 pl-8 text-[12px] text-[#7A766A]">{s.subtitle}</p>
            </section>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-[620px] border-l-2 border-[#B08A4D]/60 pl-4 font-song text-[12px] leading-[2] text-[#7D7565]">
          <p>典籍内容正在按来源与版本逐条整理。</p>
          <p>后续会标注篇卷、版本与页码；未能核验的文字不作为确定引文展示。</p>
        </div>
      </main>
    </div>
  );
}

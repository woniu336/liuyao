import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '六爻 · 小成图 | 确定性排盘',
};

const ENTRIES = [
  {
    href: '/liuyao',
    title: '六爻排盘',
    seal: '爻',
    lines: ['三钱摇卦 / 大衍筮法 / 手工录入', '纳甲装卦 · 安世应 · 定六亲', '旬空 · 伏神 · 六神 · 天医文昌'],
    note: '只排盘，不推断',
  },
  {
    href: '/xct',
    title: '小成图',
    seal: '图',
    lines: ['天地数 / 时间 / 自定选卦', '八宫天盘 · 中宫归藏', '四象八断 · 正推气路'],
    note: '只盘面，不解卦',
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-14 sm:pt-20">
      <header className="text-center">
        <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-[3px] border border-[#8e3a2c]/45 font-serif text-[19px] text-[#8e3a2c]">
          易
        </div>
        <h1 className="font-serif text-[27px] font-semibold tracking-[0.22em] text-[#22201b] sm:text-[31px]">
          六爻 · 小成图
        </h1>
        <p className="mt-2.5 font-serif text-[12px] tracking-[0.16em] text-[#7c7365]">
          确定性排盘 —— 卦象由投掷与时间决定，不由解释决定
        </p>
      </header>

      <div className="mt-9 grid gap-3.5 sm:grid-cols-2">
        {ENTRIES.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="group relative flex flex-col rounded-[4px] border border-[#E0D8C9] bg-[#FFFDF8] p-5 transition-all hover:-translate-y-[1px] hover:border-[#c9b99a] hover:shadow-[0_6px_20px_rgba(23,20,15,0.06)]"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-[17px] font-semibold tracking-[0.12em] text-[#22201b]">{e.title}</h2>
              <span className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-[#8e3a2c]/35 font-serif text-[12px] text-[#8e3a2c]">
                {e.seal}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 font-serif text-[11.5px] leading-relaxed text-[#5e5a50]">
              {e.lines.map((l) => (
                <li key={l} className="flex gap-1.5">
                  <span className="text-[#cbbfa8]">·</span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-[#EFE7D8] pt-2.5">
              <span className="font-serif text-[10.5px] tracking-[0.1em] text-[#9c7a3c]">{e.note}</span>
              <span className="font-serif text-[11.5px] text-[#5e5a50] transition-colors group-hover:text-[#8e3a2c]">
                进入 →
              </span>
            </div>
          </Link>
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-[520px] text-center font-serif text-[10.5px] leading-relaxed text-[#93897a]">
        两个工具都只输出可核查的排盘事实：六爻给纳甲与世界应、旬空神煞；小成图给九宫天盘与四象八断。
        问句只作记录，不参与任何计算。
      </p>
    </div>
  );
}

'use client';

/**
 * 案例 · 《增删卜易》卦例 100 例
 * =============================
 * 数据是静态资源 `public/data/zengshan-cases.json`，由
 * `scripts/extract-zengshan-cases.mjs` 从朱辰彬《增删卜易卦例初探》整理文本里抽取，
 * 只做结构化 + 截断，不改写原文。
 *
 * 页面上只呈现「原文说了什么」：古筮知识、原注、用神 / 吉凶 / 应期要点。
 * 不在这里给出现代断语，也不把古人的断法当成结论。
 */

import React, { useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/site/SiteHeader';
import { encodeCastState } from '@/lib/liuyao/cast-url';
import type { CoinResult } from '@/components/liuyao/types';

interface ExampleCase {
  id: number;
  topic: string;
  question: string;
  ganzhi: string;
  void: string;
  guaPair: string;
  ben: string;
  benPalace: string;
  benTag: string;
  zhi: string;
  zhiPalace: string;
  zhiTag: string;
  note: string;
  yong: string;
  luck: string;
  timing: string;
  /** 六次投掷（6/7/8/9），由本卦与之卦反推，用于还原盘面 */
  coins: number[];
  /** 与古例同「月建 + 日辰」的一个公历时刻（古例不记年，取范围内的对应日） */
  solar: string | null;
}

/** 由案例还原一次排盘链接：投掷值 + 对应公历 + 占问 */
function chartHref(c: ExampleCase): string | null {
  if (!c.solar || c.coins.length !== 6) return null;
  const qs = encodeCastState({
    coins: c.coins as CoinResult[],
    timeInput: c.solar,
    gender: '男',
    marital: 'unmarried',
    question: c.question,
  });
  return `/liuyao?${qs}`;
}

interface Payload {
  source: string;
  count: number;
  cases: ExampleCase[];
}

const PAGE = 20;

export default function ExamplesView() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void fetch('/data/zengshan-cases.json')
      .then((r) => (r.ok ? (r.json() as Promise<Payload>) : Promise.reject(new Error(`读取失败（${r.status}）`))))
      .then((json) => {
        if (alive) setData(json);
      })
      .catch((e) => {
        if (alive) setError((e as Error).message);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const list = data?.cases ?? [];
    const q = query.trim();
    if (!q) return list;
    return list.filter((c) =>
      [c.question, c.ben, c.zhi, c.benTag, c.topic, c.note, c.yong, c.luck, c.timing, String(c.id)].some((v) =>
        (v ?? '').includes(q),
      ),
    );
  }, [data, query]);

  const visible = filtered.slice(0, shown);

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#38423C]">
      <SiteHeader active="examples" />

      <main className="mx-auto w-full max-w-[860px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="text-center">
          <div className="mb-3 flex items-center justify-center gap-3 font-kai text-[11px] tracking-[0.28em] text-[#98784A]">
            <span className="h-px w-8 bg-[#B89C6C]/70" />
            古筮 · 卦例 · 研读
            <span className="h-px w-8 bg-[#B89C6C]/70" />
          </div>
          <h1 className="font-song text-[28px] font-semibold tracking-[0.2em] text-[#2F4438] sm:text-[32px]">案例</h1>
          <p className="mx-auto mt-3 max-w-[560px] font-song text-[12.5px] leading-[2] tracking-[0.03em] text-[#756E5F]">
            《增删卜易》卦例 100 例，据朱辰彬《增删卜易卦例初探》整理文本抽取。
            只摘录原文：古筮知识、原注、用神 / 吉凶 / 应期要点，供对照研读，不作现成断语。
          </p>
        </header>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#DED4BE] pb-3">
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 font-song text-[12px] text-[#8C8272]">检索</span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(PAGE);
              }}
              placeholder="卦名 / 占问 / 断语关键词，如 财、六冲、应期"
              className="h-9 w-full min-w-0 rounded-[3px] border border-[#D9CDB6] bg-white px-2.5 font-song text-[13px] text-[#2F4438] outline-none transition-colors placeholder:text-[#A6A092] focus:border-[#9A7040]"
            />
          </label>
          <span className="shrink-0 font-kai text-[11px] text-[#A4977E]">
            {data ? `共 ${data.count} 例` : error ? '读取失败' : '读取中…'}
            {query.trim() && data ? ` · 命中 ${filtered.length}` : ''}
          </span>
        </div>

        {error && (
          <p className="mt-6 rounded-[3px] border border-[#D9A99F] bg-[#FDF2EF] px-3 py-2 font-song text-[12px] text-[#8E3A2C]">
            {error}
          </p>
        )}

        {!data && !error && <p className="py-16 text-center font-song text-[12.5px] text-[#8C8272]">读取中…</p>}

        <ul className="mt-2">
          {visible.map((c) => {
            const open = openId === c.id;
            const href = chartHref(c);
            return (
              <li key={c.id} className="border-b border-[#E2DAC6]">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : c.id)}
                  aria-expanded={open}
                  className="group flex w-full items-start gap-3 py-3.5 text-left transition-colors hover:bg-[#F9F4E8]/70"
                >
                  <span className="mt-[3px] shrink-0 font-kai text-[11px] tabular-nums text-[#B49B6B]">
                    {String(c.id).padStart(3, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="font-song text-[14.5px] font-semibold tracking-[0.02em] text-[#2C2A24]">
                        {c.question}
                      </span>
                      <span className="font-song text-[12.5px] text-[#4A5A50]">
                        {c.ben}
                        {c.zhi ? (
                          <>
                            <span className="px-1 text-[#B49B6B]">→</span>
                            {c.zhi}
                          </>
                        ) : (
                          <span className="pl-1.5 font-kai text-[10.5px] text-[#A4977E]">静卦</span>
                        )}
                      </span>
                      {[c.benTag, c.zhiTag].filter(Boolean).map((t) => (
                        <span key={t} className="rounded-[2px] border border-[#D9CDB6] px-1.5 py-[1px] font-kai text-[10px] text-[#8C8272]">
                          {t}
                        </span>
                      ))}
                    </span>
                    <span className="mt-1 block font-kai text-[11px] tabular-nums text-[#8C8272]">
                      {c.ganzhi}
                      {c.void && `　旬空 ${c.void}`}
                    </span>
                  </span>
                  <span className="mt-0.5 flex shrink-0 items-center gap-2.5">
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="按此例排出六爻盘面"
                        className="rounded-[3px] border border-[#C3B79E] px-2 py-[3px] font-song text-[11px] text-[#4A5A50] transition-colors hover:border-[#9A7040] hover:text-[#8E6337]"
                      >
                        排盘
                      </a>
                    )}
                    <span aria-hidden className="text-[10px] text-[#B49B6B]">
                      {open ? '−' : '+'}
                    </span>
                  </span>
                </button>

                {open && (
                  <div className="pb-5 pl-[26px] pr-1">
                    {c.topic && (
                      <p className="mb-2.5 border-l-2 border-[#CBBFA8] pl-2.5 font-song text-[12.5px] leading-[1.95] text-[#5E574B]">
                        <span className="text-[#8C8272]">古筮知识　</span>
                        {c.topic}
                      </p>
                    )}
                    {[
                      ['原注', c.note],
                      ['用神', c.yong],
                      ['吉凶', c.luck],
                      ['应期', c.timing],
                    ]
                      .filter(([, v]) => Boolean(v))
                      .map(([label, v]) => (
                        <div key={label} className="mt-2 flex gap-2.5">
                          <span className="mt-[3px] w-8 shrink-0 font-kai text-[11px] tracking-[0.1em] text-[#A4977E]">
                            {label}
                          </span>
                          <p className="min-w-0 flex-1 font-song text-[12.5px] leading-[2] text-[#3B372F]">{v}</p>
                        </div>
                      ))}

                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="press inline-flex h-9 items-center gap-1.5 rounded-[3px] border border-[#D8C392]/50 bg-[linear-gradient(180deg,#456557_0%,#29453B_100%)] px-3.5 font-song text-[12.5px] tracking-[0.12em] text-[#F5E9CB] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
                        >
                          排出此卦
                        </a>
                      ) : (
                        <span className="font-kai text-[10.5px] text-[#A4977E]">原例未记月建，无法还原同日辰盘面</span>
                      )}
                      {c.solar && (
                        <span className="font-kai text-[10.5px] leading-relaxed text-[#A4977E]">
                          对应公历 {c.solar.replace('T', ' ')}（与古例同月建、同日辰；古例不记年）
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {data && filtered.length > visible.length && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="press inline-flex h-10 items-center justify-center rounded-[3px] border border-[#C3B79E] bg-[#FBF7EC] px-5 font-song text-[12.5px] tracking-[0.14em] text-[#3F4A42] hover:border-[#9A7040] hover:text-[#8E6337]"
            >
              再看 {Math.min(PAGE, filtered.length - visible.length)} 例
            </button>
          </div>
        )}

        {data && filtered.length === 0 && (
          <p className="py-14 text-center font-song text-[12.5px] text-[#8C8272]">没有匹配的卦例。</p>
        )}

        <p className="mt-10 border-t border-[#E2DAC6] pt-4 text-center font-kai text-[10.5px] leading-relaxed tracking-[0.04em] text-[#A4977E]">
          来源：《增删卜易》（清 · 野鹤老人）卦例，朱辰彬《增删卜易卦例初探》整理与评述；此处仅摘录原文要点。
          <br />
          古法口径与现代解读不同，案例只作研读参照，不构成任何预测结论。
        </p>
      </main>
    </div>
  );
}

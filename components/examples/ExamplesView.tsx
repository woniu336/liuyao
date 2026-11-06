'use client';

/**
 * 案例 · 《增删卜易》卦例（古籍排版）
 * =================================
 * 版式照书走：一行「例N　古筮知识：…」，接占问与干支，再是六爻卦盘，
 * 之后是原注与「1、选取用神 / 2、吉凶判断 / 3、应期细节」三段评述。
 *
 * 卦盘不是照抄文本（原文里空格与折行已经乱了），而是用同一套确定性引擎
 * 由「投掷值 + 同月建同日辰的公历」重排一遍，所以和点「排出此卦」看到的盘面一致。
 *
 * 数据：public/data/zengshan-cases.json，由 scripts/extract-zengshan-cases.mjs 生成。
 */

import React, { useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/site/SiteHeader';
import { encodeCastState } from '@/lib/liuyao/cast-url';
import type { CoinResult } from '@/components/liuyao/types';
import { buildLiuyaoInput, castTimeInfo, parseTimeInput } from '@/lib/liuyao/ganzhi';
import { castLiuyao, type LiuyaoChart, type LiuyaoLine } from '@/lib/liuyao/najia';

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
  coins: number[];
  solar: string | null;
}

interface Payload {
  source: string;
  count: number;
  cases: ExampleCase[];
}

const PER_PAGE = 6;

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

/** 爻画：阳爻一整条，阴爻中断；用实心块而非字符，跨字体都对得齐 */
function YaoBar({ yang, tone }: { yang: boolean; tone: string }) {
  if (yang) {
    return <span style={{ display: 'block', width: 44, height: 4, background: tone, borderRadius: 1 }} />;
  }
  return (
    <span style={{ display: 'flex', width: 44, height: 4, gap: 8 }}>
      <i style={{ flex: 1, background: tone, borderRadius: 1 }} />
      <i style={{ flex: 1, background: tone, borderRadius: 1 }} />
    </span>
  );
}

/** 列宽：移动端先保证整盘放得下（伏神列在 <sm 隐藏，改用表下注记） */
const COL = {
  god: 26,
  hidden: 64,
  yao: 38,
  najia: 72,
  mark: 14,
  move: 20,
} as const;

const MONO = '"Songti SC", "Noto Serif SC", "SimSun", serif';

/** 单例卦盘：六神 / 伏神 / 本卦 / 世应 / 动 / 变卦 / 变世应 */
function CaseChart({ chart }: { chart: LiuyaoChart }) {
  const lines = useMemo(() => [...chart.lines].sort((a, b) => b.position - a.position), [chart.lines]);
  const changed = chart.changedLines;
  const changedWorld = chart.changed?.generation ?? null;
  const changedResponse = changedWorld ? ((changedWorld + 2) % 6) + 1 : null;

  const row = (l: LiuyaoLine) => {
    const ch = changed?.[l.position - 1];
    const hidden = l.hiddenSpirit;
    return (
      <div key={l.position} className="flex items-center gap-1.5 py-[5px] leading-none">
        <span style={{ width: COL.god }} className="shrink-0 text-[12px] text-[#6E6A5C]">
          {l.sixGod}
        </span>
        <span
          style={{ width: COL.hidden }}
          className="hidden shrink-0 truncate text-[11px] text-[#8E6337] sm:block"
        >
          {hidden ? `${hidden.relation}${hidden.stemBranch}` : ''}
        </span>
        <span style={{ width: COL.yao }} className="flex shrink-0 justify-start">
          <YaoBar yang={l.isYang} tone="#2C2A24" />
        </span>
        <span style={{ width: COL.najia }} className="shrink-0 text-[12px] text-[#2C2A24]">
          {`${l.relation}${l.stem}${l.branch}${l.element}`}
        </span>
        <span style={{ width: COL.mark }} className="shrink-0 text-[11.5px] text-[#8E3A2C]">
          {l.isWorld ? '世' : l.isResponse ? '应' : ''}
        </span>
        <span style={{ width: COL.move }} className="shrink-0 text-[11px] text-[#8E3A2C]">
          {l.isMoving ? (l.isYang ? '○→' : '×→') : ''}
        </span>
        <span style={{ width: COL.yao }} className="flex shrink-0 justify-start">
          {ch ? <YaoBar yang={l.isMoving ? !l.isYang : l.isYang} tone="#5A3B31" /> : null}
        </span>
        <span style={{ width: COL.najia }} className="shrink-0 text-[12px] text-[#2C2A24]">
          {ch ? `${ch.relation}${ch.stem}${ch.branch}${ch.element}` : ''}
        </span>
        <span style={{ width: COL.mark }} className="shrink-0 text-[11.5px] text-[#8E3A2C]">
          {ch ? (l.position === changedWorld ? '世' : l.position === changedResponse ? '应' : '') : ''}
        </span>
      </div>
    );
  };

  const hidden = lines
    .filter((l) => l.hiddenSpirit)
    .map((l) => ({ position: l.position, text: `${l.hiddenSpirit?.relation}${l.hiddenSpirit?.stemBranch}` }));

  const header = (
    <div className="flex items-center gap-1.5 pb-1 text-[10.5px] text-[#A4977E]">
      <span style={{ width: COL.god }} className="shrink-0">
        六神
      </span>
      <span style={{ width: COL.hidden }} className="hidden shrink-0 sm:block">
        伏神
      </span>
      <span style={{ width: COL.yao }} className="shrink-0">
        本卦
      </span>
      <span style={{ width: COL.najia }} className="shrink-0">
        纳甲
      </span>
      <span style={{ width: COL.mark }} className="shrink-0" />
      <span style={{ width: COL.move }} className="shrink-0" />
      <span style={{ width: COL.yao }} className="shrink-0">
        变卦
      </span>
      <span style={{ width: COL.najia }} className="shrink-0">
        纳甲
      </span>
      <span style={{ width: COL.mark }} className="shrink-0" />
    </div>
  );

  return (
    <div className="mt-2 overflow-x-auto">
      <div className="min-w-[334px]" style={{ fontFamily: MONO }}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12px] text-[#4A5A50]">
          <span>
            {chart.base.palace}宫：{chart.base.name}
            {chart.base.tags.length ? `（${chart.base.tags.join('、')}）` : ''}
          </span>
          {chart.changed && (
            <span>
              {chart.changed.palace}宫：{chart.changed.name}
              {chart.changed.tags.length ? `（${chart.changed.tags.join('、')}）` : ''}
            </span>
          )}
        </div>
        <div className="mt-1 border-t border-[#2C2A24]/70 pt-1">
          {header}
          <div className="border-t border-[#2C2A24]/25">{lines.map(row)}</div>
        </div>
        {/* 窄屏不显示伏神列，改用一行注记 */}
        {hidden.length > 0 && (
          <p className="mt-1.5 font-kai text-[10.5px] leading-relaxed text-[#8E6337] sm:hidden">
            伏神：{hidden.map((h) => `${h.text}（${h.position}爻）`).join('　')}
          </p>
        )}
      </div>
    </div>
  );
}

function buildChart(c: ExampleCase): LiuyaoChart | null {
  if (!c.solar || c.coins.length !== 6) return null;
  try {
    const time = castTimeInfo(parseTimeInput(c.solar));
    return castLiuyao(buildLiuyaoInput(time, c.coins));
  } catch {
    return null;
  }
}

function CaseBlock({ c }: { c: ExampleCase }) {
  const chart = useMemo(() => buildChart(c), [c]);
  const href = chartHref(c);

  return (
    <article className="border-b border-[#E2DAC6] pb-7 pt-6">
      {/* 例号 + 古筮知识 */}
      <h2 className="font-song text-[13.5px] leading-[2] text-[#2C2A24]">
        <span className="mr-2 font-kai text-[12px] tabular-nums text-[#B49B6B]">例{c.id}</span>
        <span className="text-[#8C8272]">古筮知识：</span>
        {c.topic}
      </h2>

      {/* 占问 + 得卦 */}
      <p className="mt-1 font-song text-[13px] leading-[2] text-[#3B372F]">
        {c.ganzhi && <span className="text-[#6E6A5C]">{c.ganzhi.replace(/\s+/g, '')}，</span>}
        {c.question}
        {c.guaPair && (
          <>
            ，得「<span className="text-[#3F5145]">{c.guaPair}</span>」
          </>
        )}
      </p>

      <p className="mt-0.5 font-kai text-[11.5px] tabular-nums text-[#8C8272]">
        干支：{c.ganzhi}
        {c.void && `　（旬空：${c.void}）`}
      </p>

      {chart ? (
        <CaseChart chart={chart} />
      ) : (
        <p className="mt-2 font-kai text-[11px] text-[#A4977E]">原例未记月建或干支，无法还原卦盘。</p>
      )}

      {/* 原注与三段评述 */}
      <div className="mt-4 space-y-2.5">
        {c.note && (
          <p className="font-song text-[13px] leading-[2.05] text-[#3B372F]">
            <span className="text-[#8C8272]">原注：</span>
            {c.note}
          </p>
        )}
        {[
          ['1、选取用神：', c.yong],
          ['2、吉凶判断：', c.luck],
          ['3、应期细节：', c.timing],
        ]
          .filter(([, v]) => Boolean(v))
          .map(([label, v]) => (
            <p key={label} className="font-song text-[13px] leading-[2.05] text-[#3B372F]">
              <span className="text-[#6E6A5C]">{label}</span>
              {v}
            </p>
          ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="press inline-flex h-8 items-center rounded-[3px] border border-[#C3B79E] px-3 font-song text-[11.5px] text-[#4A5A50] transition-colors hover:border-[#9A7040] hover:text-[#8E6337]"
          >
            排出此卦 · 看完整盘面
          </a>
        ) : null}
        {c.solar && (
          <span className="font-kai text-[10.5px] text-[#A4977E]">
            对应公历 {c.solar.replace('T', ' ')}（同月建、同日辰；古例不记年）
          </span>
        )}
      </div>
    </article>
  );
}

export default function ExamplesView() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#38423C]">
      <SiteHeader active="examples" />

      <main className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-8 sm:px-6 sm:pt-11">
        <header className="text-center">
          <div className="mb-3 flex items-center justify-center gap-3 font-kai text-[11px] tracking-[0.28em] text-[#98784A]">
            <span className="h-px w-8 bg-[#B89C6C]/70" />
            古筮 · 卦例 · 研读
            <span className="h-px w-8 bg-[#B89C6C]/70" />
          </div>
          <h1 className="font-song text-[28px] font-semibold tracking-[0.2em] text-[#2F4438] sm:text-[32px]">案例</h1>
          <p className="mx-auto mt-3 max-w-[560px] font-song text-[12.5px] leading-[2] tracking-[0.03em] text-[#756E5F]">
            《增删卜易》卦例 100 例，据朱辰彬《增删卜易卦例初探》整理文本抽取。
            卦盘由同一套确定性引擎重排（同月建、同日辰），只摘录原文，不作现成断语。
          </p>
        </header>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-[#DED4BE] py-2.5">
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 font-song text-[12px] text-[#8C8272]">检索</span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="卦名 / 占问 / 断语关键词，如 财、六冲、应期"
              className="h-9 w-full min-w-0 border-0 border-b border-[#D9CDB6] bg-transparent px-1 font-song text-[13px] text-[#2F4438] outline-none transition-colors placeholder:text-[#A6A092] focus:border-[#9A7040]"
            />
          </label>
          <span className="shrink-0 font-kai text-[11px] text-[#A4977E]">
            {data ? `共 ${data.count} 例` : error ? '读取失败' : '读取中…'}
            {query.trim() && data ? ` · 命中 ${filtered.length}` : ''}
          </span>
        </div>

        {error && (
          <p className="mt-6 border border-[#D9A99F] bg-[#FDF2EF] px-3 py-2 font-song text-[12px] text-[#8E3A2C]">
            {error}
          </p>
        )}

        {!data && !error && <p className="py-16 text-center font-song text-[12.5px] text-[#8C8272]">读取中…</p>}

        {visible.map((c) => (
          <CaseBlock key={c.id} c={c} />
        ))}

        {data && filtered.length === 0 && (
          <p className="py-14 text-center font-song text-[12.5px] text-[#8C8272]">没有匹配的卦例。</p>
        )}

        {data && filtered.length > 0 && (
          <nav className="mt-6 flex items-center justify-center gap-3 font-song text-[12.5px] text-[#4A5A50]">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={current <= 1}
              className="press inline-flex h-9 items-center rounded-[3px] border border-[#C3B79E] px-3 disabled:opacity-40"
            >
              上一页
            </button>
            <span className="font-kai tabular-nums text-[#8C8272]">
              第 {current} / {totalPages} 页
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={current >= totalPages}
              className="press inline-flex h-9 items-center rounded-[3px] border border-[#C3B79E] px-3 disabled:opacity-40"
            >
              下一页
            </button>
          </nav>
        )}

        <p className="mt-10 border-t border-[#E2DAC6] pt-4 text-center font-kai text-[10.5px] leading-relaxed tracking-[0.04em] text-[#A4977E]">
          来源：《增删卜易》（清 · 野鹤老人）卦例，朱辰彬《增删卜易卦例初探》整理与评述；此处仅摘录原文要点。
          <br />
          卦盘按原例的月建、日辰重排，供对照研读；古法口径不等于现代结论。
        </p>
      </main>
    </div>
  );
}

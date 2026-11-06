'use client';

/**
 * 案例 · 《增删卜易》卦例
 * ======================
 * 专业研读档案的版式：
 *   - 桌面端「主内容 + 侧栏」：右侧固定检索、快筛、页码与说明，左边专心读案例；
 *   - 卦盘独立成块并作为视觉中心（六神 / 伏神 / 本卦纳甲 / 世应 / 动 / 变卦纳甲 / 变世应）；
 *   - 原注按句断成小段，三条断语各自成卡（01 选取用神 / 02 吉凶判断 / 03 应期细节）；
 *   - 两套配色：暖纸（默认，宣纸米）与冷白（浅青灰面 + 古铜点缀），选择记在本机。
 *
 * 数据：public/data/zengshan-cases.json（scripts/extract-zengshan-cases.mjs 生成）。
 * 卦盘由同一引擎按「投掷值 + 同月建同日辰的公历」重排，与「排出此卦 · 看完整盘面」一致。
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

type Palette = 'warm' | 'cool';

const PALETTES: Record<
  Palette,
  { bg: string; card: string; soft: string; ink: string; body: string; muted: string; hair: string; accent: string; accentSoft: string; accentLine: string }
> = {
  warm: {
    bg: '#F7F4EF',
    card: '#FCFAF5',
    soft: '#F4EFE5',
    ink: '#242422',
    body: '#33322E',
    muted: '#6F6A60',
    hair: '#E1D8C8',
    accent: '#C23A2B',
    accentSoft: 'rgba(194,58,43,0.08)',
    accentLine: 'rgba(194,58,43,0.45)',
  },
  cool: {
    bg: '#F5F7F8',
    card: '#FFFFFF',
    soft: '#EEF2F3',
    ink: '#1D2326',
    body: '#2C3438',
    muted: '#6C7A7E',
    hair: '#DCE3E5',
    accent: '#8A5A2B',
    accentSoft: 'rgba(138,90,43,0.10)',
    accentLine: 'rgba(138,90,43,0.45)',
  },
};

const PER_PAGE = 6;
const FILTERS = ['全部', '六冲', '六合', '游魂', '归魂'] as const;
type Filter = (typeof FILTERS)[number];
const THEME_KEY = 'liuyao.examples.palette';

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

function buildChart(c: ExampleCase): LiuyaoChart | null {
  if (!c.solar || c.coins.length !== 6) return null;
  try {
    return castLiuyao(buildLiuyaoInput(castTimeInfo(parseTimeInput(c.solar)), c.coins));
  } catch {
    return null;
  }
}

/** 原注：按句切成小段，长段读起来才不闷 */
function sentences(text: string, per = 2): string[] {
  const parts = text.split(/(?<=[。！？])/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i += per) out.push(parts.slice(i, i + per).join(''));
  return out.length ? out : [text];
}

/** 爻画：实心块，跨字体对齐 */
function YaoBar({ yang, tone }: { yang: boolean; tone: string }) {
  if (yang) return <span style={{ display: 'block', width: 38, height: 4, background: tone, borderRadius: 1 }} />;
  return (
    <span style={{ display: 'flex', width: 38, height: 4, gap: 8 }}>
      <i style={{ flex: 1, background: tone, borderRadius: 1 }} />
      <i style={{ flex: 1, background: tone, borderRadius: 1 }} />
    </span>
  );
}

/** 列宽走 CSS 变量（见 globals.css 的 .ex-chart），窄屏收紧、宽屏放宽 */
const COL = {
  god: 'var(--col-god)',
  hidden: 'var(--col-hidden)',
  yao: 'var(--col-yao)',
  najia: 'var(--col-najia)',
  mark: 'var(--col-mark)',
  move: 'var(--col-move)',
  gap: 'var(--col-gap)',
} as const;

function Mark({ text, accent, soft }: { text: string; accent: string; soft: string }) {
  if (!text) return <span style={{ width: COL.mark }} className="shrink-0" />;
  return (
    <span style={{ width: COL.mark }} className="flex shrink-0 justify-center">
      <span
        className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] leading-none"
        style={{ background: soft, color: accent }}
      >
        {text}
      </span>
    </span>
  );
}

/** 卦盘：本页的视觉中心 */
function CaseChart({ chart, p }: { chart: LiuyaoChart; p: (typeof PALETTES)[Palette] }) {
  const lines = useMemo(() => [...chart.lines].sort((a, b) => b.position - a.position), [chart.lines]);
  const changed = chart.changedLines;
  const changedWorld = chart.changed?.generation ?? null;
  const changedResponse = changedWorld ? ((changedWorld + 2) % 6) + 1 : null;
  const hidden = lines
    .filter((l) => l.hiddenSpirit)
    .map((l) => ({ position: l.position, text: `${l.hiddenSpirit?.relation}${l.hiddenSpirit?.stemBranch}` }));

  const row = (l: LiuyaoLine) => {
    const ch = changed?.[l.position - 1];
    const h = l.hiddenSpirit;
    return (
      <div
        key={l.position}
        className="flex items-center rounded-[5px] px-1 py-[7px]"
        style={{
          gap: COL.gap,
          ...(l.isMoving ? { background: p.accentSoft, boxShadow: `inset 2px 0 0 ${p.accentLine}` } : null),
        }}
      >
        <span style={{ width: COL.god, color: p.muted }} className="shrink-0 text-[11.5px]">
          {l.sixGod}
        </span>
        <span
          style={{ width: COL.hidden, color: '#A9793F' }}
          className="hidden shrink-0 truncate text-[10.5px] sm:block"
        >
          {h ? `${h.relation}${h.stemBranch}` : ''}
        </span>
        <span style={{ width: COL.yao }} className="flex shrink-0 justify-start">
          <YaoBar yang={l.isYang} tone={p.ink} />
        </span>
        <span style={{ width: COL.najia, color: p.ink }} className="shrink-0 text-[12.5px]">
          {`${l.relation}${l.stem}${l.branch}${l.element}`}
        </span>
        <Mark text={l.isWorld ? '世' : l.isResponse ? '应' : ''} accent={p.accent} soft={p.accentSoft} />
        <span style={{ width: COL.move, color: p.accent }} className="shrink-0 text-[11px]">
          {l.isMoving ? (l.isYang ? '○→' : '×→') : ''}
        </span>
        <span style={{ width: COL.yao }} className="flex shrink-0 justify-start">
          {ch ? <YaoBar yang={l.isMoving ? !l.isYang : l.isYang} tone={p.muted} /> : null}
        </span>
        <span style={{ width: COL.najia, color: p.body }} className="shrink-0 text-[12.5px]">
          {ch ? `${ch.relation}${ch.stem}${ch.branch}${ch.element}` : ''}
        </span>
        <Mark
          text={ch ? (l.position === changedWorld ? '世' : l.position === changedResponse ? '应' : '') : ''}
          accent={p.accent}
          soft={p.accentSoft}
        />
      </div>
    );
  };

  return (
    <section
      className="mt-3 rounded-[12px] border px-3 py-3 sm:px-4 sm:py-3.5"
      style={{ borderColor: p.hair, background: p.soft }}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-song text-[13px] font-semibold tracking-[0.06em]" style={{ color: p.ink }}>
          六神 / 本卦 / 变卦
        </h3>
        <span className="text-[11px]" style={{ color: p.muted }}>
          {chart.base.palace}宫 · {chart.base.name}
          {chart.base.tags.length ? ` · ${chart.base.tags.join('、')}` : ''}
          {chart.changed ? `　→　${chart.changed.name}` : '　（静卦）'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="ex-chart min-w-[330px]">
          <div className="flex items-center px-1 pb-1 text-[10px]" style={{ color: p.muted, gap: COL.gap }}>
            <span style={{ width: COL.god }} className="shrink-0">六神</span>
            <span style={{ width: COL.hidden }} className="hidden shrink-0 sm:block">伏神</span>
            <span style={{ width: COL.yao }} className="shrink-0">本卦</span>
            <span style={{ width: COL.najia }} className="shrink-0">纳甲</span>
            <span style={{ width: COL.mark }} className="shrink-0">世应</span>
            <span style={{ width: COL.move }} className="shrink-0">动</span>
            <span style={{ width: COL.yao }} className="shrink-0">变卦</span>
            <span style={{ width: COL.najia }} className="shrink-0">纳甲</span>
            <span style={{ width: COL.mark }} className="shrink-0">世应</span>
          </div>
          <div className="border-t" style={{ borderColor: p.hair }}>
            {lines.map(row)}
          </div>
        </div>
      </div>

      {hidden.length > 0 && (
        <p className="mt-1.5 text-[10.5px] leading-relaxed sm:hidden" style={{ color: '#A9793F' }}>
          伏神：{hidden.map((x) => `${x.text}（${x.position}爻）`).join('　')}
        </p>
      )}

      <div
        className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-2 text-[10.5px]"
        style={{ borderColor: p.hair, color: p.muted }}
      >
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-full" style={{ background: p.accentSoft, boxShadow: `inset 0 0 0 1px ${p.accentLine}` }} />
          世 / 应
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-full" style={{ background: p.accentSoft }} />
          动爻：×→ 阴动 / ○→ 阳动
        </span>
        <span>变卦世应按变卦宫位定</span>
      </div>
    </section>
  );
}

const SECTIONS: { key: 'yong' | 'luck' | 'timing'; no: string; title: string; hint: string }[] = [
  { key: 'yong', no: '01', title: '选取用神', hint: '取哪一爻为用，为什么' },
  { key: 'luck', no: '02', title: '吉凶判断', hint: '动兆与日月如何定成败' },
  { key: 'timing', no: '03', title: '应期细节', hint: '何时应、事态细节' },
];

function CopyButton({ c, chart, p }: { c: ExampleCase; chart: LiuyaoChart | null; p: (typeof PALETTES)[Palette] }) {
  const [done, setDone] = useState(false);

  const copy = async () => {
    const rows = chart
      ? [...chart.lines]
          .sort((a, b) => b.position - a.position)
          .map((l) => {
            const ch = chart.changedLines?.[l.position - 1];
            const h = l.hiddenSpirit ? `${l.hiddenSpirit.relation}${l.hiddenSpirit.stemBranch}` : '';
            return `${l.sixGod}\t${h}\t${l.isYang ? '▅▅▅▅▅' : '▅▅　▅▅'}\t${l.relation}${l.stem}${l.branch}${l.element}\t${
              l.isWorld ? '世' : l.isResponse ? '应' : ''
            }\t${l.isMoving ? (l.isYang ? '○→' : '×→') : ''}\t${ch ? `${ch.relation}${ch.stem}${ch.branch}${ch.element}` : ''}`
          })
          .join('\n')
      : '';
    const text = [
      `例${c.id}　古筮知识：${c.topic}`,
      `${c.ganzhi}，${c.question}，得「${c.guaPair}」`,
      `干支：${c.ganzhi}${c.void ? `（旬空：${c.void}）` : ''}`,
      rows,
      c.note ? `原注：${c.note}` : '',
      c.yong ? `1、选取用神：${c.yong}` : '',
      c.luck ? `2、吉凶判断：${c.luck}` : '',
      c.timing ? `3、应期细节：${c.timing}` : '',
      '—— 野鹤六爻 · 案例（卦盘由确定性引擎重排）',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      window.setTimeout(() => setDone(false), 1800);
    } catch {
      /* 隐私模式：忽略 */
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="press inline-flex h-10 items-center justify-center rounded-[8px] border px-4 text-[12.5px] transition-colors"
      style={{ borderColor: p.hair, color: p.body, background: 'transparent' }}
    >
      {done ? '已复制' : '复制此例'}
    </button>
  );
}

function CaseCard({ c, p }: { c: ExampleCase; p: (typeof PALETTES)[Palette] }) {
  const chart = useMemo(() => buildChart(c), [c]);
  const href = chartHref(c);
  const noteParas = c.note ? sentences(c.note) : [];

  return (
    <article
      className="rounded-[14px] border px-4 py-5 sm:px-6 sm:py-6"
      style={{ borderColor: p.hair, background: p.card }}
    >
      {/* 标题 + 例号 */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-song text-[18px] font-semibold leading-[1.5] sm:text-[21px]" style={{ color: p.ink }}>
          {c.question}
        </h2>
        <span
          className="mt-0.5 shrink-0 rounded-[4px] border px-1.5 py-[2px] font-kai text-[11px] leading-none"
          style={{ borderColor: p.accentLine, color: p.accent }}
        >
          例{c.id}
        </span>
      </div>

      {c.topic && (
        <p className="mt-2.5 text-[12px] leading-[1.9]" style={{ color: p.muted }}>
          <span style={{ opacity: 0.75 }}>古筮知识　</span>
          {c.topic}
        </p>
      )}

      {/* 基本信息 */}
      <dl className="mt-3.5 space-y-1.5 border-t pt-3.5 text-[12.5px] leading-[1.75]" style={{ borderColor: p.hair }}>
        <div className="flex gap-3">
          <dt className="w-[60px] shrink-0" style={{ color: p.muted }}>占问时间</dt>
          <dd style={{ color: p.body }}>
            {c.ganzhi || '原文未记'}
            {c.void && <span style={{ color: p.muted }}>（旬空 {c.void}）</span>}
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-[60px] shrink-0" style={{ color: p.muted }}>得卦</dt>
          <dd style={{ color: p.body }}>
            {c.ben}
            {c.zhi ? <span style={{ color: p.accent }}> → </span> : <span style={{ color: p.muted }}>（静卦）</span>}
            {c.zhi}
            {[c.benTag, c.zhiTag].filter(Boolean).length > 0 && (
              <span style={{ color: p.muted }}>　{[c.benTag, c.zhiTag].filter(Boolean).join(' · ')}</span>
            )}
          </dd>
        </div>
      </dl>

      {/* 卦盘（视觉中心） */}
      {chart ? (
        <CaseChart chart={chart} p={p} />
      ) : (
        <p
          className="mt-3 rounded-[10px] border px-3 py-2.5 text-[11.5px]"
          style={{ borderColor: p.hair, background: p.soft, color: p.muted }}
        >
          原例未记月建或干支，无法还原卦盘。
        </p>
      )}

      {/* 原注：拆成小段 */}
      {noteParas.length > 0 && (
        <section className="mt-3 rounded-[12px] border px-4 py-3.5" style={{ borderColor: p.hair, background: p.card }}>
          <h3 className="font-song text-[12.5px] font-semibold tracking-[0.08em]" style={{ color: p.muted }}>
            原注
          </h3>
          <div className="mt-2 space-y-2">
            {noteParas.map((para, i) => (
              <p key={i} className="font-song text-[13px] leading-[2.05]" style={{ color: p.body }}>
                {para}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* 三条断语 */}
      <div className="mt-3 space-y-2.5">
        {SECTIONS.filter((s) => Boolean(c[s.key])).map((s) => (
          <section
            key={s.key}
            className="flex gap-3.5 rounded-[12px] border px-4 py-3.5"
            style={{ borderColor: p.hair, background: p.card }}
          >
            <span
              className="mt-[2px] shrink-0 font-song text-[21px] leading-none tabular-nums"
              style={{ color: p.hair }}
            >
              {s.no}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5">
                <h3 className="font-song text-[14.5px] font-semibold tracking-[0.04em]" style={{ color: p.ink }}>
                  {s.title}
                </h3>
                <span className="text-[10.5px]" style={{ color: p.muted }}>{s.hint}</span>
              </div>
              <p className="mt-1.5 font-song text-[13px] leading-[2.1]" style={{ color: p.body }}>
                {c[s.key]}
              </p>
            </div>
          </section>
        ))}
      </div>

      {/* 操作 */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="press inline-flex h-10 items-center justify-center rounded-[8px] px-5 text-[13px] tracking-[0.04em]"
            style={{ background: p.accent, color: '#FFF9F3' }}
          >
            排出此卦 · 看完整盘面
          </a>
        ) : null}
        <CopyButton c={c} chart={chart} p={p} />
        {c.solar && (
          <span className="text-[10.5px] leading-relaxed" style={{ color: p.muted }}>
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
  const [filter, setFilter] = useState<Filter>('全部');
  const [page, setPage] = useState(1);
  const [palette, setPalette] = useState<Palette>('warm');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved === 'cool' || saved === 'warm') setPalette(saved);
    } catch {
      /* 忽略 */
    }
  }, []);

  const switchPalette = (next: Palette) => {
    setPalette(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 忽略 */
    }
  };

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

  const p = PALETTES[palette];

  const filtered = useMemo(() => {
    const list = data?.cases ?? [];
    const q = query.trim();
    return list.filter((c) => {
      if (filter !== '全部' && !`${c.benTag}${c.zhiTag}`.includes(filter)) return false;
      if (!q) return true;
      return [c.question, c.ben, c.zhi, c.benTag, c.topic, c.note, c.yong, c.luck, c.timing, String(c.id)].some((v) =>
        (v ?? '').includes(q),
      );
    });
  }, [data, query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <div className="min-h-screen" style={{ background: p.bg, color: p.ink }}>
      <SiteHeader active="examples" tone={palette === 'cool' ? 'cool' : 'warm'} />

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
        {/* 标题区 */}
        <header className="text-center lg:text-left">
          <div className="mb-2.5 flex items-center justify-center gap-3 lg:justify-start" aria-hidden>
            <span className="h-px w-8" style={{ background: p.hair }} />
            <span className="text-[10px]" style={{ color: p.hair }}>❖</span>
            <span className="h-px w-8" style={{ background: p.hair }} />
          </div>
          <h1 className="font-song text-[32px] font-semibold leading-none tracking-[0.16em] sm:text-[38px]" style={{ color: p.ink }}>
            案例
          </h1>
          <p className="mt-2.5 text-[11.5px]" style={{ color: p.muted }}>
            来源：《增删卜易》卦例 · 朱辰彬《增删卜易卦例初探》
          </p>
        </header>

        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_292px] lg:items-start lg:gap-7">
          {/* 侧栏：桌面端固定在右侧，移动端落在列表上方 */}
          <aside className="order-1 mb-5 space-y-3 lg:order-2 lg:mb-0 lg:sticky lg:top-[70px]">
            <div className="rounded-[12px] border px-3.5 py-3.5" style={{ borderColor: p.hair, background: p.card }}>
              <label className="flex items-center gap-2 rounded-[8px] border px-2.5 py-2" style={{ borderColor: p.hair }}>
                <span className="shrink-0 whitespace-nowrap text-[11.5px]" style={{ color: p.muted }}>
                  检索
                </span>
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="卦名 / 占问 / 断语"
                  className="h-6 w-full min-w-0 border-0 bg-transparent text-[12.5px] outline-none placeholder:text-[#B3AA9B]"
                  style={{ color: p.ink }}
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="shrink-0 text-[11px]" style={{ color: p.muted }}>
                    清空
                  </button>
                )}
              </label>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {FILTERS.map((f) => {
                  const active = filter === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setFilter(f);
                        setPage(1);
                      }}
                      className="press inline-flex h-7 items-center rounded-full border px-2.5 text-[11.5px] transition-colors"
                      style={{
                        borderColor: active ? p.accentLine : p.hair,
                        background: active ? p.accentSoft : 'transparent',
                        color: active ? p.accent : p.muted,
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 border-t pt-2.5 text-[11px] tabular-nums" style={{ borderColor: p.hair, color: p.muted }}>
                {data ? `${filtered.length} / ${data.count} 例` : error ? '读取失败' : '读取中…'}
                {data && filtered.length > 0 && `　·　第 ${current} / ${totalPages} 页`}
              </p>
            </div>

            <div className="rounded-[12px] border px-3.5 py-3" style={{ borderColor: p.hair, background: p.card }}>
              <h2 className="text-[11.5px] font-semibold tracking-[0.06em]" style={{ color: p.muted }}>
                读法
              </h2>
              <p className="mt-1.5 text-[11px] leading-[1.95]" style={{ color: p.muted }}>
                卦盘按原例的月建、日辰重排，六神与世应可与原书对照。
                「排出此卦」打开完整卦单（含神煞、旬空、伏神与四段解卦）。
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-[12px] border px-3.5 py-2.5" style={{ borderColor: p.hair, background: p.card }}>
              <span className="text-[11px]" style={{ color: p.muted }}>配色</span>
              {(
                [
                  ['warm', '暖纸'],
                  ['cool', '冷白'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchPalette(id)}
                  className="press inline-flex h-7 items-center rounded-full border px-2.5 text-[11px]"
                  style={{
                    borderColor: palette === id ? p.accentLine : p.hair,
                    background: palette === id ? p.accentSoft : 'transparent',
                    color: palette === id ? p.accent : p.muted,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </aside>

          {/* 主内容 */}
          <div className="order-2 lg:order-1">
            {error && (
              <p
                className="rounded-[10px] border px-3.5 py-2.5 text-[12px]"
                style={{ borderColor: '#E4B9AE', background: '#FDF2EF', color: p.accent }}
              >
                {error}
              </p>
            )}

            {!data && !error && (
              <p className="py-16 text-center text-[12.5px]" style={{ color: p.muted }}>
                读取中…
              </p>
            )}

            <div className="space-y-4">
              {visible.map((c) => (
                <CaseCard key={c.id} c={c} p={p} />
              ))}
            </div>

            {data && filtered.length === 0 && (
              <p className="py-14 text-center text-[12.5px]" style={{ color: p.muted }}>
                没有匹配的卦例。
              </p>
            )}

            {data && filtered.length > 0 && (
              <nav className="mt-5 flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPage((v) => Math.max(1, v - 1))}
                  disabled={current <= 1}
                  className="press inline-flex h-9 items-center rounded-[8px] border px-4 text-[12.5px] disabled:opacity-40"
                  style={{ borderColor: p.hair, color: p.body }}
                >
                  上一页
                </button>
                <span className="px-1 text-[12px] tabular-nums" style={{ color: p.muted }}>
                  {current} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                  disabled={current >= totalPages}
                  className="press inline-flex h-9 items-center rounded-[8px] border px-4 text-[12.5px] disabled:opacity-40"
                  style={{ borderColor: p.hair, color: p.body }}
                >
                  下一页
                </button>
              </nav>
            )}

            <p className="mt-8 text-center text-[10.5px] leading-relaxed" style={{ color: p.muted }}>
              古法口径不等于现代结论；案例仅作研读参照。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

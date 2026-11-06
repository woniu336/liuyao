'use client';

/**
 * 案例 · 《增删卜易》卦例
 * ======================
 * 一例一个大框，框内照书的次序读：
 *   例N　古筮知识：…
 *   酉月辛亥日，占谒贵求财，得「兑之解」
 *   干支：酉月 辛亥日　（旬空：寅卯）
 *   兑宫：兑为泽（六冲）　　　　震宫：雷水解
 *   六神　【本　　卦】　　　　　【变　　卦】
 *   螣蛇　▅▅　▅▅　父母未土　世　　　▅▅　▅▅　父母戌土
 *   …
 *   原注：… ／ 1、选取用神：… ／ 2、吉凶判断：… ／ 3、应期细节：…
 *
 * 卦盘是本页的视觉中心，但不再拆成小卡片：只用一层浅底把六行托住。
 * 数据：public/data/zengshan-cases.json；卦盘由同一引擎按「投掷值 + 同月建同日辰」重排。
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

const INK = '#242422';
const BODY = '#33322E';
const MUTED = '#6F6A60';
const HAIR = '#E1D8C8';
const CARD = '#FCFAF5';
const SOFT = '#F4EFE5';
const ACCENT = '#C23A2B';

const PER_PAGE = 6;
const FILTERS = ['全部', '六冲', '六合', '游魂', '归魂'] as const;
type Filter = (typeof FILTERS)[number];

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

/** 爻画：实心块，跨字体对齐 */
function YaoBar({ yang, tone }: { yang: boolean; tone: string }) {
  if (yang) return <span style={{ display: 'block', width: 36, height: 4, background: tone, borderRadius: 1 }} />;
  return (
    <span style={{ display: 'flex', width: 36, height: 4, gap: 8 }}>
      <i style={{ flex: 1, background: tone, borderRadius: 1 }} />
      <i style={{ flex: 1, background: tone, borderRadius: 1 }} />
    </span>
  );
}

const GAP = 4;
const W = { god: 28, hidden: 56, yao: 34, najia: 74, mark: 18, move: 22 } as const;

/** 卦盘：照书的列次排（六神 / 伏神 / 本卦 / 世应 / 动 / 变卦 / 世应）
 *  用 CSS grid 统一列宽，表头的「本卦 / 变卦」正好压在自己那两列（爻画 + 纳甲）之上。 */
function CaseChart({ chart }: { chart: LiuyaoChart }) {
  const lines = useMemo(() => [...chart.lines].sort((a, b) => b.position - a.position), [chart.lines]);
  const changed = chart.changedLines;
  const changedWorld = chart.changed?.generation ?? null;
  const changedResponse = changedWorld ? ((changedWorld + 2) % 6) + 1 : null;
  const hasHidden = lines.some((l) => l.hiddenSpirit);

  const cols = [
    `${W.god}px`,
    ...(hasHidden ? [`${W.hidden}px`] : []),
    `${W.yao}px`,
    `${W.najia}px`,
    `${W.mark}px`,
    `${W.move}px`,
    `${W.yao}px`,
    `${W.najia}px`,
    `${W.mark}px`,
  ];
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: cols.join(' '),
    columnGap: GAP,
    alignItems: 'center',
  };

  const row = (l: LiuyaoLine) => {
    const ch = changed?.[l.position - 1];
    const h = l.hiddenSpirit;
    return (
      <div
        key={l.position}
        className="py-[5px]"
        style={{
          ...gridStyle,
          ...(l.isMoving ? { background: 'rgba(194,58,43,0.05)' } : null),
        }}
      >
        <span style={{ color: MUTED }} className="text-[11px]">
          {l.sixGod}
        </span>
        {hasHidden && (
          <span style={{ color: '#A9793F' }} className="hidden truncate text-[10.5px] sm:block">
            {h ? `${h.relation}${h.stemBranch}` : ''}
          </span>
        )}
        <span className="flex justify-start">
          <YaoBar yang={l.isYang} tone={INK} />
        </span>
        <span style={{ color: INK }} className="text-[12px]">
          {`${l.relation}${l.stem}${l.branch}${l.element}`}
        </span>
        <span style={{ color: ACCENT }} className="text-center text-[11px]">
          {l.isWorld ? '世' : l.isResponse ? '应' : ''}
        </span>
        <span style={{ color: ACCENT }} className="text-center text-[11px]">
          {l.isMoving ? (l.isYang ? '○→' : '×→') : ''}
        </span>
        <span className="flex justify-start">
          {ch ? <YaoBar yang={l.isMoving ? !l.isYang : l.isYang} tone="#5E564D" /> : null}
        </span>
        <span style={{ color: BODY }} className="text-[12px]">
          {ch ? `${ch.relation}${ch.stem}${ch.branch}${ch.element}` : ''}
        </span>
        <span style={{ color: ACCENT }} className="text-center text-[11px]">
          {ch ? (l.position === changedWorld ? '世' : l.position === changedResponse ? '应' : '') : ''}
        </span>
      </div>
    );
  };

  return (
    <div className="mt-2.5 overflow-x-auto">
      <div className="min-w-[322px]">
        {/* 宫位与卦名 */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-[11.5px]" style={{ color: MUTED }}>
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

        {/* 列名：本卦 / 变卦 各压在「爻画 + 纳甲」两列之上 */}
        <div className="pb-1 text-[10.5px]" style={{ ...gridStyle, color: MUTED }}>
          <span>六神</span>
          {hasHidden && <span className="hidden sm:block">伏神</span>}
          <span className="col-span-2 text-center">【本　　卦】</span>
          <span className="col-span-2" />
          <span className="col-span-2 text-center">【变　　卦】</span>
          <span />
        </div>

        <div className="border-t pt-1" style={{ borderColor: `${INK}55` }}>
          {lines.map(row)}
        </div>
      </div>
    </div>
  );
}

function CaseCard({ c }: { c: ExampleCase }) {
  const chart = useMemo(() => buildChart(c), [c]);
  const href = chartHref(c);
  return (
    <article className="rounded-[14px] border px-4 py-4 sm:px-5 sm:py-5" style={{ borderColor: HAIR, background: CARD }}>
      {/* 例N + 古筮知识 */}
      <h2 className="font-song text-[13px] leading-[1.95]" style={{ color: BODY }}>
        <span className="mr-2 font-kai text-[12.5px]" style={{ color: ACCENT }}>
          例{c.id}
        </span>
        <span style={{ color: MUTED }}>古筮知识：</span>
        {c.topic}
      </h2>

      {/* 占问与干支 */}
      <p className="mt-1 font-song text-[13px] leading-[1.95]" style={{ color: BODY }}>
        {c.ganzhi && `${c.ganzhi.replace(/\s+/g, '')}，`}
        {c.question}
        {c.guaPair && `，得「${c.guaPair}」`}
      </p>
      <p className="mt-0.5 font-kai text-[11.5px] tabular-nums" style={{ color: MUTED }}>
        干支：{c.ganzhi || '原文未记'}
        {c.void && `　（旬空：${c.void}）`}
      </p>

      {/* 卦盘：一层浅底托住六行 */}
      {chart ? (
        <div className="mt-2.5 rounded-[10px] border px-3 py-2.5" style={{ borderColor: HAIR, background: SOFT }}>
          <CaseChart chart={chart} />
        </div>
      ) : (
        <p className="mt-2.5 text-[11.5px]" style={{ color: MUTED }}>
          原例未记月建或干支，无法还原卦盘。
        </p>
      )}

      {/* 原注与三段评述：照书的顺序，不拆卡 */}
      <div className="mt-3 space-y-1.5 font-song text-[13px] leading-[2]" style={{ color: BODY }}>
        {c.note && (
          <p>
            <span style={{ color: MUTED }}>原注：</span>
            {c.note}
          </p>
        )}
        {c.yong && (
          <p>
            <span style={{ color: MUTED }}>1、选取用神：</span>
            {c.yong}
          </p>
        )}
        {c.luck && (
          <p>
            <span style={{ color: MUTED }}>2、吉凶判断：</span>
            {c.luck}
          </p>
        )}
        {c.timing && (
          <p>
            <span style={{ color: MUTED }}>3、应期细节：</span>
            {c.timing}
          </p>
        )}
      </div>

      {/* 操作 */}
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="press inline-flex h-9 items-center justify-center rounded-[8px] px-4 text-[12.5px] tracking-[0.04em]"
            style={{ background: ACCENT, color: '#FFF9F3' }}
          >
            排出此卦 · 看完整盘面
          </a>
        ) : null}
        {c.solar && (
          <span className="text-[10.5px]" style={{ color: MUTED }}>
            对应公历 {c.solar.replace('T', ' ')}（同月建、同日辰）
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
    <div className="min-h-screen" style={{ background: '#F7F4EF', color: INK }}>
      <SiteHeader active="examples" />

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
        <header className="text-center lg:text-left">
          <div className="mb-2.5 flex items-center justify-center gap-3 lg:justify-start" aria-hidden>
            <span className="h-px w-8" style={{ background: HAIR }} />
            <span className="text-[10px]" style={{ color: HAIR }}>❖</span>
            <span className="h-px w-8" style={{ background: HAIR }} />
          </div>
          <h1 className="font-song text-[30px] font-semibold leading-none tracking-[0.16em] sm:text-[34px]" style={{ color: INK }}>
            案例
          </h1>
          <p className="mt-2.5 text-[11.5px]" style={{ color: MUTED }}>
            来源：《增删卜易》卦例 · 朱辰彬《增删卜易卦例初探》
          </p>
        </header>

        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_272px] lg:items-start lg:gap-7">
          {/* 侧栏：桌面固定在右，移动端在列表上方 */}
          <aside className="order-1 mb-5 space-y-3 lg:order-2 lg:mb-0 lg:sticky lg:top-[70px]">
            <div className="rounded-[12px] border px-3.5 py-3.5" style={{ borderColor: HAIR, background: CARD }}>
              <label className="flex items-center gap-2 rounded-[8px] border px-2.5 py-2" style={{ borderColor: HAIR }}>
                <span className="shrink-0 whitespace-nowrap text-[11.5px]" style={{ color: MUTED }}>
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
                  style={{ color: INK }}
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="shrink-0 text-[11px]" style={{ color: MUTED }}>
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
                        borderColor: active ? 'rgba(194,58,43,0.45)' : HAIR,
                        background: active ? 'rgba(194,58,43,0.08)' : 'transparent',
                        color: active ? ACCENT : MUTED,
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 border-t pt-2.5 text-[11px] tabular-nums" style={{ borderColor: HAIR, color: MUTED }}>
                {data ? `${filtered.length} / ${data.count} 例` : error ? '读取失败' : '读取中…'}
                {data && filtered.length > 0 && `　·　第 ${current} / ${totalPages} 页`}
              </p>
            </div>

            <div className="rounded-[12px] border px-3.5 py-3" style={{ borderColor: HAIR, background: CARD }}>
              <h2 className="text-[11.5px] font-semibold tracking-[0.06em]" style={{ color: MUTED }}>
                读法
              </h2>
              <p className="mt-1.5 text-[11px] leading-[1.95]" style={{ color: MUTED }}>
                卦盘按原例的月建、日辰重排，六神与世应可与原书对照。
                「排出此卦」打开完整卦单（含神煞、旬空、伏神与四段解卦）。
              </p>
            </div>
          </aside>

          {/* 主内容 */}
          <div className="order-2 lg:order-1">
            {error && (
              <p
                className="rounded-[10px] border px-3.5 py-2.5 text-[12px]"
                style={{ borderColor: '#E4B9AE', background: '#FDF2EF', color: ACCENT }}
              >
                {error}
              </p>
            )}

            {!data && !error && (
              <p className="py-16 text-center text-[12.5px]" style={{ color: MUTED }}>
                读取中…
              </p>
            )}

            <div className="space-y-3.5">
              {visible.map((c) => (
                <CaseCard key={c.id} c={c} />
              ))}
            </div>

            {data && filtered.length === 0 && (
              <p className="py-14 text-center text-[12.5px]" style={{ color: MUTED }}>
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
                  style={{ borderColor: HAIR, color: BODY }}
                >
                  上一页
                </button>
                <span className="px-1 text-[12px] tabular-nums" style={{ color: MUTED }}>
                  {current} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                  disabled={current >= totalPages}
                  className="press inline-flex h-9 items-center rounded-[8px] border px-4 text-[12.5px] disabled:opacity-40"
                  style={{ borderColor: HAIR, color: BODY }}
                >
                  下一页
                </button>
              </nav>
            )}

            <p className="mt-8 text-center text-[10.5px] leading-relaxed" style={{ color: MUTED }}>
              古法口径不等于现代结论；案例仅作研读参照。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

/**
 * 六十四卦选择器（手动指定用）
 * ============================
 * 参考资料里「自选卦」的做法：不给 64 个平铺格子，而是按八宫分组，
 * 先认宫再认卦；选中后与另一个卦逐爻比对，自动算出动爻。
 */

import React, { useMemo, useState } from 'react';
import { SIXTY_FOUR_HEXAGRAMS, type TrigramName } from '@/lib/liuyao/najia';
import { TRIGRAM_BITS } from '@/lib/xct/constants';

export interface GuaEntry {
  binary: string;
  name: string;
  palace: TrigramName;
  rank: number;
}

const ALL: GuaEntry[] = Object.entries(SIXTY_FOUR_HEXAGRAMS)
  .map(([binary, info]) => ({ binary, name: info.name, palace: info.palace, rank: info.rank }))
  .sort((a, b) => a.palace.localeCompare(b.palace) || a.rank - b.rank);

const PALACES: TrigramName[] = ['乾', '坎', '艮', '震', '巽', '离', '坤', '兑'];

export function guaByBinary(binary: string): GuaEntry | undefined {
  const info = SIXTY_FOUR_HEXAGRAMS[binary];
  if (!info) return undefined;
  return { binary, name: info.name, palace: info.palace, rank: info.rank };
}

/** 由上下卦（三爻二进制串）拼 6 位二进制 */
export function binaryOf(upper: string, lower: string): string {
  return `${lower}${upper}`;
}

/** 两卦逐爻比对 → 动爻位（1..6，自初爻起） */
export function movingBetween(benBinary: string, zhiBinary: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < 6; i += 1) if (benBinary[i] !== zhiBinary[i]) out.push(i + 1);
  return out;
}

/** 六爻掩码 → 爻的阴阳（初爻在下） */
export function yangOf(binary: string): boolean[] {
  return binary.split('').map((b) => b === '1');
}

/** 六爻卦画：自上而下（上爻在顶），细线，克制 */
function GuaLines({ binary, dim }: { binary: string; dim?: boolean }) {
  const bits = yangOf(binary);
  return (
    <span className="flex flex-col items-center gap-[2px]" aria-hidden>
      {[...bits].reverse().map((yang, i) => (
        <span key={i} className="flex h-[3px] w-[26px]" style={{ gap: 3 }}>
          {yang ? (
            <span className="h-full w-full" style={{ background: dim ? 'var(--ink-500)' : 'var(--ink-900)' }} />
          ) : (
            <>
              <span className="h-full flex-1" style={{ background: dim ? 'var(--ink-500)' : 'var(--ink-900)' }} />
              <span className="h-full flex-1" style={{ background: dim ? 'var(--ink-500)' : 'var(--ink-900)' }} />
            </>
          )}
        </span>
      ))}
    </span>
  );
}

export default function GuaPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (binary: string) => void;
  label: string;
}) {
  const [palace, setPalace] = useState<TrigramName>('乾');
  const list = useMemo(() => ALL.filter((g) => g.palace === palace), [palace]);
  const current = guaByBinary(value);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11.5px] text-ink-500">{label}</span>
        <span className="font-song text-[13px] text-ink-900">{current?.name ?? '未选'}</span>
      </div>

      {/* 八宫：以宫主卦为入口 */}
      <div className="mb-1 flex items-baseline gap-2">
        <span className="font-song text-[12px] font-semibold text-ink-800">选宫</span>
        <span className="text-[10px] tracking-[0.1em] text-ink-400">先定八宫，再选本宫八卦</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 bg-paper-2/70 p-1.5 sm:grid-cols-8">
        {PALACES.map((p) => {
          const main = ALL.find((g) => g.palace === p && g.rank === 1);
          const active = palace === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPalace(p)}
              className="press flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-1"
              style={{ border: `1px solid ${active ? 'var(--ink-900)' : 'var(--hairline)'}` }}
            >
              <GuaLines binary={main?.binary ?? '111111'} dim={!active} />
              <span className={`font-song text-[10.5px] ${active ? 'text-ink-900' : 'text-ink-500'}`}>{p}宫</span>
            </button>
          );
        })}
      </div>

      {/* 本宫八卦 */}
      <div
        className="mb-1 flex items-baseline justify-between pt-3 text-[10px] tracking-[0.14em] text-ink-400"
        style={{ borderTop: '1px solid var(--hairline)' }}
      >
        <span className="font-song text-[12px] font-semibold text-ink-800">选卦</span>
        <span className="tracking-normal">{palace}宫八卦</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {list.map((g) => {
          const active = g.binary === value;
          return (
            <button
              key={g.binary}
              type="button"
              onClick={() => onChange(g.binary)}
              className="press flex min-h-[56px] flex-col items-center justify-center gap-1 py-1.5"
              style={{
                border: `1px solid ${active ? 'var(--ink-900)' : 'var(--hairline)'}`,
                background: active ? 'rgba(31,42,48,0.04)' : 'transparent',
              }}
            >
              <GuaLines binary={g.binary} dim={!active} />
              <span
                className={`font-song text-[10.5px] leading-tight tracking-tight ${
                  active ? 'font-semibold text-ink-900' : 'text-ink-600'
                }`}
              >
                {g.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 供外部使用的三位二进制（上/下卦） */
export function trigramBinary(t: TrigramName): string {
  return TRIGRAM_BITS[t].join('');
}

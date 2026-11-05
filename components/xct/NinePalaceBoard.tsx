'use client';

import React from 'react';
import { PalaceNumber, PalaceJudgment } from '@/lib/xct/types';
import { PALACE_NAMES } from '@/lib/xct/constants';

interface NinePalaceBoardProps {
  judgments: Record<PalaceNumber, PalaceJudgment>;
  activePalace: PalaceNumber;
  onSelectPalace: (p: PalaceNumber) => void;
}

// 洛书九宫标准排布 (3x3)
// 4 9 2
// 3 5 7
// 8 1 6
const GRID_PALACES: PalaceNumber[][] = [
  [4, 9, 2],
  [3, 5, 7],
  [8, 1, 6],
];

/** 吉类 / 凶类断语：借爻形做标记（吉一横、凶两短横），不引入彩虹配色 */
const GOOD_VERDICTS = new Set(['吉', '亨', '利', '贞']);

function VerdictMark({ verdict }: { verdict: string }) {
  if (!GOOD_VERDICTS.has(verdict) && !['凶', '害', '悔', '吝'].includes(verdict)) return null;
  const good = GOOD_VERDICTS.has(verdict);
  return (
    <span className="verdict-mark" aria-hidden>
      <span />
      {!good && <span />}
    </span>
  );
}

export default function NinePalaceBoard({ judgments, activePalace, onSelectPalace }: NinePalaceBoardProps) {
  return (
    <div className="w-full select-none overflow-hidden rounded-[3px] border border-[#DED6C6] bg-[#FAF7F0]">
      <div className="flex items-baseline justify-between border-b border-[#DED6C6] px-4 py-2.5">
        <h2 className="font-serif text-[12.5px] font-semibold tracking-[0.22em] text-[#22201B]">九 宫 分 布</h2>
        <span className="text-[11px] text-[#5E5A50]">点击宫位切换</span>
      </div>

      <div className="grid grid-cols-3 gap-px bg-[#DED6C6]">
        {GRID_PALACES.flat().map((p) => {
          const j = judgments[p];
          const isSelected = activePalace === p;

          const statusLine =
            p === 5
              ? '归藏之枢'
              : [j.verdict, j.mode ? `${j.mode}式` : null, j.matched !== null ? (j.matched ? '得配' : '失配') : null]
                  .filter(Boolean)
                  .join(' · ');

          const hexName = p === 5 ? '' : j.hexName || `${j.heaven}之${j.earth}`;

          return (
            <button
              key={p}
              type="button"
              onClick={() => onSelectPalace(p)}
              aria-pressed={isSelected}
              className={`relative flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1.5 px-2.5 pb-3 pt-4 text-center transition-colors ${
                isSelected ? 'bg-[#22201B]' : 'bg-[#F6F2EA] hover:bg-[#F1ECE1]'
              }`}
            >
              <span
                className={`absolute left-2.5 top-2 font-serif text-[11px] tracking-[0.06em] ${
                  isSelected ? 'text-[#FAF7F0]/60' : 'text-[#5E5A50]'
                }`}
              >
                {PALACE_NAMES[p].slice(0, 2)}
              </span>

              <span className={`font-serif text-[25px] leading-none ${isSelected ? 'text-[#FAF7F0]' : 'text-[#22201B]'}`}>
                {j.heaven}
              </span>

              <span
                className={`max-w-full truncate font-serif text-[11px] ${
                  isSelected ? 'text-[#FAF7F0]/70' : 'text-[#5E5A50]'
                }`}
              >
                {hexName || '\u00A0'}
              </span>

              <span
                className={`flex items-center gap-1.5 font-serif text-[11px] ${
                  isSelected ? 'text-[#FAF7F0]/85' : 'text-[#5E5A50]'
                }`}
              >
                {p !== 5 && <VerdictMark verdict={j.verdict} />}
                <span className="truncate">{statusLine}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

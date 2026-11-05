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

export default function NinePalaceBoard({ judgments, activePalace, onSelectPalace }: NinePalaceBoardProps) {
  return (
    <div className="w-full select-none overflow-hidden rounded-[3px] border border-[#DED4BE] bg-[#FBF7EC]">
      <div className="flex items-baseline justify-between border-b border-[#DED4BE] px-4 py-2.5">
        <h2 className="font-song text-[12.5px] font-semibold tracking-[0.22em] text-[#2F4438]">九 宫 分 布</h2>
        <span className="font-song text-[11px] text-[#8C8272]">点击宫位切换</span>
      </div>

      <div className="grid grid-cols-3 gap-px bg-[#DED4BE]">
        {GRID_PALACES.flat().map((p) => {
          const j = judgments[p];
          const isSelected = activePalace === p;

          // 只列盘面结构（四象式），不给「吉凶悔吝」类断语：断语属于解读层，
          // 直接摆在盘面上容易被当成确定结论。
          const statusLine =
            p === 5 ? '归藏之枢' : j.verdict === '归位' ? '归位' : j.mode ? `${j.mode}式` : '—';

          const hexName = p === 5 ? '' : j.hexName || `${j.heaven}之${j.earth}`;

          return (
            <button
              key={p}
              type="button"
              onClick={() => onSelectPalace(p)}
              aria-pressed={isSelected}
              className={`relative flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1.5 px-2.5 pb-3 pt-4 text-center transition-colors ${
                isSelected ? 'bg-[#2F4438]' : 'bg-[#FCF9F0] hover:bg-[#F6F1E4]'
              }`}
            >
              <span
                className={`absolute left-2.5 top-2 font-serif text-[11px] tracking-[0.06em] ${
                  isSelected ? 'text-[#F5E9CB]/65' : 'text-[#7C7668]'
                }`}
              >
                {PALACE_NAMES[p].slice(0, 2)}
              </span>

              <span className={`font-serif text-[25px] leading-none ${isSelected ? 'text-[#F5E9CB]' : 'text-[#2C2A24]'}`}>
                {j.heaven}
              </span>

              <span
                className={`max-w-full truncate font-serif text-[11px] ${
                  isSelected ? 'text-[#F5E9CB]/70' : 'text-[#7C7668]'
                }`}
              >
                {hexName || '\u00A0'}
              </span>

              <span
                className={`flex items-center gap-1.5 font-serif text-[11px] ${
                  isSelected ? 'text-[#F5E9CB]/85' : 'text-[#7C7668]'
                }`}
              >
                <span className="truncate">{statusLine}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

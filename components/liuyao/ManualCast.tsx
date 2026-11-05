'use client';

import React from 'react';
import type { CoinResult } from './types';

interface ManualCastProps {
  values: (CoinResult | null)[];
  onChange: (idx: number, value: CoinResult) => void;
}

const OPTIONS: { value: CoinResult; label: string; mark: string }[] = [
  { value: 6, label: '老阴', mark: '×' },
  { value: 8, label: '少阴', mark: '' },
  { value: 7, label: '少阳', mark: '' },
  { value: 9, label: '老阳', mark: '○' },
];

/**
 * 手工录入：已知卦象但手上没有投掷记录时的入口。
 * 只负责凑齐六爻数值，卦象与纳甲仍由引擎确定性重排（不信任任何手填卦名）。
 */
export default function ManualCast({ values, onChange }: ManualCastProps) {
  const order = [6, 5, 4, 3, 2, 1]; // 自上而下排布
  const posName = (i: number) => ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][i - 1];

  return (
    <div className="w-full space-y-1.5">
      {order.map((pos) => {
        const idx = pos - 1;
        const current = values[idx];
        return (
          <div key={pos} className="flex items-center gap-2">
            <span className="w-9 shrink-0 font-serif text-[11.5px] text-[#5e5a50]">{posName(pos)}</span>
            <div className="grid flex-1 grid-cols-4 gap-1.5">
              {OPTIONS.map((opt) => {
                const active = current === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(idx, opt.value)}
                    className={`h-9 cursor-pointer rounded-[3px] border font-serif text-[11.5px] transition-colors ${
                      active
                        ? 'border-[#8e3a2c] bg-[#8e3a2c] text-[#fffdf8]'
                        : 'border-[#d9cdb6] bg-[#faf7f0] text-[#5e5a50] hover:border-[#a5342b]/50'
                    }`}
                  >
                    {opt.label}
                    {opt.mark && <span className="ml-0.5 text-[10px]">{opt.mark}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="pt-1 font-serif text-[10.5px] text-[#8c8272]">
        老阴（×）老阳（○）为动爻；六爻填满后下方按钮即可排盘。
      </p>
    </div>
  );
}

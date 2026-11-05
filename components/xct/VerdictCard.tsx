'use client';

import React from 'react';
import type { PalaceJudgment } from '@/lib/xct/types';

interface VerdictCardProps {
  judgment: PalaceJudgment;
  /** 正推气路，如「乾六 → 兑七 → 乾六」；无链时传空 */
  chainPath?: string;
  /** 链末状态：闭环 / 归位 / 归藏 / 无 */
  chainEnd?: string;
}

/**
 * 结论卡：当前宫位 + 四象八断。
 *
 * 原版这里右侧还有一个「解盘」按钮（调大模型写卦断）。裁剪版只保留确定性断语，
 * 断语本身来自 judgeEngine 的四象（阖辟往来）× 阴阳得配失配查表，不是大模型生成。
 */
export default function VerdictCard({ judgment, chainPath, chainEnd }: VerdictCardProps) {
  const subLine =
    judgment.mode || judgment.matched !== null
      ? [
          judgment.mode ? `${judgment.mode}式` : null,
          judgment.matched !== null ? (judgment.matched ? '得配' : '失配') : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : '';

  return (
    <div className="mt-4 rounded-[3px] border border-[#CBBFA8] bg-[#F8F3E9] px-5 py-3.5">
      <div className="flex items-baseline gap-2.5 text-[11px] tracking-[0.04em] text-[#5E5A50]">
        <span>当前宫位</span>
        <b className="font-serif text-[12.5px] font-semibold tracking-[0.1em] text-[#22201B]">
          {judgment.palaceName.slice(0, 2)}
        </b>
        <span>
          天盘{judgment.heaven}
          {judgment.earth ? ` · ${judgment.hexName || `${judgment.heaven}之${judgment.earth}`}` : ''}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2 sm:gap-2.5">
        <span className="shrink-0 whitespace-nowrap pb-1 font-serif text-[12px] tracking-[0.14em] text-[#5E5A50]">
          断为
        </span>
        <span className="whitespace-nowrap font-serif text-[32px] leading-none tracking-[0.02em] text-[#22201B] sm:text-[40px]">
          「{judgment.verdict}」
        </span>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-[#DED6C6] pt-2.5 text-[11px] tracking-[0.03em] text-[#5E5A50]">
        <span>{subLine || '　'}</span>
        {chainPath && (
          <span>
            正推气路　<span className="text-[#22201B]">{chainPath}</span>
            {chainEnd ? `　${chainEnd}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}

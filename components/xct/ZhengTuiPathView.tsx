'use client';

import React from 'react';
import { ZhengTuiChain, BoardState, PalaceNumber } from '@/lib/xct/types';

interface ZhengTuiPathViewProps {
  chain: ZhengTuiChain;
  board?: BoardState;
  activePalace: PalaceNumber;
  onSelectPalace: (p: PalaceNumber) => void;
}

/**
 * 正推气路（数往者顺）。
 *
 * 早先每一站是一个填色胶囊：用神站琥珀、闭环站紫、归位站青绿，选中站墨底，
 * 而判语又写死了深褐 `text-[#5A5346]` 不跟随底色——选中时对比度只剩 1.3:1，
 * 等于把「吉」字抹掉了。现在站号改圆圈（中性形制），判语继承文字色，
 * 用「用 / 闭 / 归」三个字区分首末站，不再用色块。
 */
export default function ZhengTuiPathView({
  chain,
  activePalace,
  onSelectPalace,
}: ZhengTuiPathViewProps) {
  if (!chain || !chain.nodes || chain.nodes.length === 0) {
    return null;
  }

  const endText =
    chain.endReason === 'guiwei'
      ? '归位 · 气止得位'
      : chain.hasCycle
        ? '气路闭环循环'
        : chain.endReason === 'center'
          ? '气机归藏入中'
          : '链止于末站';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {chain.nodes.map((node, index) => {
          const isSelected = activePalace === node.palace;
          const isFirst = index === 0;
          const isLast = index === chain.nodes.length - 1;

          const badge = isFirst
            ? '用'
            : isLast && chain.endReason === 'guiwei'
              ? '归'
              : isLast && chain.hasCycle
                ? '闭'
                : String(index + 1);

          return (
            <React.Fragment key={`${node.palace}-${index}`}>
              <button
                type="button"
                onClick={() => onSelectPalace(node.palace)}
                aria-pressed={isSelected}
                className="flex cursor-pointer items-center gap-2 text-left"
              >
                <span
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border font-serif text-[11px] transition-colors ${
                    isSelected
                      ? 'border-[#22201B] bg-[#22201B] text-[#FAF7F0]'
                      : 'border-[#CBBFA8] text-[#5E5A50]'
                  }`}
                >
                  {badge}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-serif text-[12px] text-[#22201B]">{node.palaceName.slice(0, 2)}</span>
                  <span className="font-serif text-[11px] text-[#5E5A50]">
                    {node.judgment.hexName || node.heaven} · {node.judgment.verdict}
                  </span>
                </span>
              </button>

              {index < chain.nodes.length - 1 && (
                <span className="text-[11px] text-[#CBBFA8]">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-[#5E5A50]">
        {endText}
        {chain.summary ? `　${chain.summary}` : ''}
      </p>
    </div>
  );
}

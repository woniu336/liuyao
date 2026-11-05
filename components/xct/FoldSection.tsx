'use client';

import React from 'react';

interface FoldSectionProps {
  title: string;
  /** 收起时也显示的一行摘要，让读者不必展开就知道里面是什么 */
  summary?: string;
  children: React.ReactNode;
}

/**
 * 折叠段：正推演化、盘面详录这类「要看时才看」的内容。
 *
 * 早先它们是两张与九宫同规格的卡，视觉上和主盘平起平坐，
 * 六张同宽同底色的卡摞下来，读者分不出哪块该先看。
 * 收起成一行后，首屏只剩「象 → 结论 → 宫」三件事。
 */
export default function FoldSection({ title, summary, children }: FoldSectionProps) {
  return (
    <details className="group border-t border-[#DED6C6]">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 py-3 text-[11.5px] text-[#5E5A50] transition-colors hover:text-[#22201B]">
        <span className="w-2 text-[8px] transition-transform group-open:rotate-90">▸</span>
        <b className="font-serif text-[11.5px] font-semibold tracking-[0.12em] text-[#22201B]">{title}</b>
        {summary && <span className="truncate">{summary}</span>}
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

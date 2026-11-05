'use client';

/**
 * 六爻结果页（S2 · 单列居中）
 * ==========================
 * 一块纸、一条中轴：卦名 → 公历干支 → 盘面（居中，按容器等比缩放）→ 四段解卦。
 *
 * 设计口径（与首页同一套语言：宣纸 + 松墨绿 + 淡金线）：
 *   - 右上角只留「历史排盘」与「截图」，不铺全站导航；
 *   - 底部只留两件事：「重新起卦」与「切换到小成图排盘」（静卦无变，不给切换入口）；
 *   - 盘面只呈现确定性排盘，不标用神（断语属于解读层，不压在版面上）；
 *   - 不再有「保存」按钮：解卦完成即静默归档进历史排盘，少一个要点的东西。
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera } from 'lucide-react';
import ResponsiveBoard from './ResponsiveBoard';
import ReadingPanel, { type ReadingPanelHandle } from './ReadingPanel';
import SiteHeader from '@/components/site/SiteHeader';
import InkLandscape from '@/components/site/InkLandscape';
import { formatSolarDateDisplay, type BoardViewProps } from '@/lib/liuyao/board-view';
import type { LiuyaoReadingFacts } from '@/lib/readings/types';

export type ReadingPhase = 'idle' | 'streaming' | 'done' | 'error';

const PRIMARY_BTN =
  'press inline-flex h-12 items-center justify-center rounded-[3px] border border-[#D8C392]/50 bg-[linear-gradient(180deg,#456557_0%,#29453B_100%)] px-4 font-song text-[14px] tracking-[0.16em] text-[#F5E9CB] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-colors hover:bg-[#223D34] disabled:opacity-60';

const SECONDARY_BTN =
  'press inline-flex h-12 shrink-0 items-center justify-center rounded-[3px] border border-[#C3B79E] bg-[#FBF7EC] px-5 font-song text-[14px] tracking-[0.16em] text-[#3F4A42] transition-colors hover:border-[#9A7040] hover:text-[#8E6337]';

export default function LiuyaoResult({
  boardProps,
  facts,
  question,
  onReset,
  onSave,
  onSwitchXct,
}: {
  boardProps: BoardViewProps;
  facts: LiuyaoReadingFacts;
  question: string;
  onReset: () => void;
  /** 解卦完成后的静默归档（历史排盘） */
  onSave: () => Promise<void> | void;
  onSwitchXct: () => void;
}) {
  const panelRef = useRef<ReadingPanelHandle | null>(null);
  const shotRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<ReadingPhase>('idle');
  const [shooting, setShooting] = useState(false);
  const archivedRef = useRef(false);

  /** 静卦无动爻，小成图无从立变，不给切换入口 */
  const canSwitchXct = useMemo(() => boardProps.lines.some((l) => l.is_moving), [boardProps.lines]);

  // 解卦读完即归档（用户不再需要点「保存」）
  useEffect(() => {
    if (phase !== 'done' || archivedRef.current) return;
    archivedRef.current = true;
    void onSave();
  }, [phase, onSave]);

  /** 截图：只截盘面那张纸（确定性排盘），不含解卦文字 */
  const handleShot = async () => {
    const node = shotRef.current;
    if (!node || shooting) return;
    setShooting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(node, {
        pixelRatio: 3,
        backgroundColor: '#FCFAF3',
        cacheBust: true,
      });
      const name = `六爻_${boardProps.hexagram_info.base_name}_${boardProps.datetime_info.solar_date.replace(/[^\d]/g, '').slice(0, 12)}.png`;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = name;
      a.click();
    } catch {
      /* 隐私模式/跨域字体失败时静默，不弹窗打扰 */
    } finally {
      window.setTimeout(() => setShooting(false), 600);
    }
  };

  const changedName =
    boardProps.hexagram_info.changed_name &&
    boardProps.hexagram_info.changed_name !== boardProps.hexagram_info.base_name
      ? boardProps.hexagram_info.changed_name
      : '';
  const solar = formatSolarDateDisplay(boardProps.datetime_info.solar_date, boardProps.datetime_info.ganzhi);

  return (
    <div className="relative min-h-screen bg-[#F4F1E8] pb-32 text-[#38423C]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[260px] overflow-hidden opacity-80">
        <InkLandscape />
      </div>

      <SiteHeader
        sticky
        showNav={false}
        maxWidthClassName="max-w-[720px]"
        actions={
          <>
            <Link
              href="/cases"
              className="font-song text-[12.5px] tracking-[0.06em] text-[#5E5A50] underline-offset-4 transition-colors hover:text-[#8E6337] hover:underline"
            >
              历史排盘
            </Link>
            <span aria-hidden className="h-4 w-px bg-[#C8BEA8]" />
            <button
              type="button"
              onClick={() => void handleShot()}
              disabled={shooting}
              aria-label="截图确定性排盘"
              title="截图（确定性排盘）"
              className="press flex h-8 items-center gap-1.5 rounded-full border border-[#C3B79E] bg-[#FCF9F0]/70 px-3 font-song text-[12px] text-[#4A4438] transition-colors hover:border-[#9A7040] hover:text-[#8E6337] disabled:opacity-50"
            >
              <Camera size={13} strokeWidth={1.7} />
              {shooting ? '生成中' : '截图'}
            </button>
          </>
        }
      />

      <main className="relative z-10 mx-auto w-full max-w-[640px] px-4 sm:px-6">
        {/* 卦名：本卦 ⇌ 变卦 */}
        <div className="pb-1 pt-5 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <h1 className="font-song text-[26px] font-semibold leading-tight tracking-[0.16em] text-[#2F4438] sm:text-[32px]">
              {boardProps.hexagram_info.base_name}
            </h1>
            {changedName && (
              <>
                <span aria-hidden className="font-song text-[15px] text-[#8E6337]">
                  ⇌
                </span>
                <span className="font-song text-[21px] font-semibold tracking-[0.14em] text-[#2F4438] sm:text-[26px]">
                  {changedName}
                </span>
              </>
            )}
          </div>
          <p className="mt-2 font-song text-[11.5px] tabular-nums tracking-[0.04em] text-[#7C7668]">
            公历：{solar}　·　{boardProps.datetime_info.ganzhi}
          </p>
          {question.trim() && (
            <p className="mt-1.5 font-kai text-[12.5px] tracking-[0.04em] text-[#6E6A5C]">「{question.trim()}」</p>
          )}
        </div>

        {/* 太极分隔 */}
        <div aria-hidden className="my-3 flex items-center justify-center gap-3">
          <span className="h-px w-10 bg-[#CBBFA8]/80" />
          <span className="font-song text-[13px] text-[#8E6337]">☯</span>
          <span className="h-px w-10 bg-[#CBBFA8]/80" />
        </div>

        {/* 盘面：一张纸，居中 */}
        <div
          ref={shotRef}
          className="mx-auto w-full max-w-[440px] bg-[#FBF7EC] px-4 py-4 sm:px-5"
          style={{
            borderRadius: 10,
            border: '1px solid rgba(179,160,125,0.55)',
            boxShadow: '0 8px 24px rgba(64,69,60,0.08)',
          }}
        >
          <ResponsiveBoard {...boardProps} />
        </div>

        {/* 解卦（入口在面板内，底部只留导航动作） */}
        <div className="mt-5">
          <ReadingPanel ref={panelRef} facts={facts} onPhaseChange={setPhase} />
        </div>
      </main>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 bg-[#F4F1E8]/95 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[640px] px-4 pt-2.5 sm:px-6" style={{ borderTop: '1px solid #DDD4BE' }}>
          <div className="flex items-center gap-2.5">
            {canSwitchXct ? (
              <>
                <button type="button" onClick={onReset} className={SECONDARY_BTN}>
                  重新起卦
                </button>
                <button type="button" onClick={onSwitchXct} className={`${PRIMARY_BTN} flex-1`}>
                  切换到小成图排盘
                </button>
              </>
            ) : (
              <button type="button" onClick={onReset} className={`${PRIMARY_BTN} flex-1`}>
                重新起卦
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * 六爻结果页（S2 · 单列居中）
 * ==========================
 * 一块纸、一条中轴：卦名 → 公历干支 → 盘面（居中，按容器等比缩放）→ 四段解卦。
 *
 * 设计口径（与首页同一套语言：宣纸 + 松墨绿 + 淡金线）：
 *   - 右上角只留「历史排盘」与「截图」，不铺全站导航；
 *   - 顶部工具条：历史排盘 / 重新起卦 / 截图；底部只放当前动作（解卦 / 停止）；
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

const HEADER_LINK =
  'font-song text-[11.5px] tracking-[0.05em] text-[#5E5A50] underline-offset-4 transition-colors hover:text-[#8E6337] hover:underline sm:text-[12.5px]';

export default function LiuyaoResult({
  boardProps,
  facts,
  question,
  onReset,
  onSave,
}: {
  boardProps: BoardViewProps;
  facts: LiuyaoReadingFacts;
  question: string;
  onReset: () => void;
  /** 解卦完成后的静默归档（历史排盘） */
  onSave: () => Promise<void> | void;
}) {
  const panelRef = useRef<ReadingPanelHandle | null>(null);
  const shotRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<ReadingPhase>('idle');
  const [shooting, setShooting] = useState(false);
  const archivedRef = useRef(false);

  const streaming = phase === 'streaming';
  /** 底栏只在「还没解 / 正在解」时出现；读完（或出错）就收起 */
  const showActionBar = phase === 'idle' || streaming;

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
      // 注意：捕获节点的 `mx-auto` 在克隆里会按**外层容器**重新居中，
      // 宽屏下（卡片比容器窄）就会整体右移、右侧被裁掉。这里把外边距钉成 0，
      // 并把宽高写死，导出的图才和屏幕上这块纸一致。
      const dataUrl = await toPng(node, {
        pixelRatio: 3,
        backgroundColor: '#FCFAF3',
        cacheBust: true,
        width: node.offsetWidth,
        height: node.offsetHeight,
        style: { margin: '0', transform: 'none' },
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
    <div className={`relative min-h-screen bg-[#F4F1E8] text-[#38423C] ${showActionBar ? 'pb-28 lg:pb-16' : 'pb-12 lg:pb-16'}`}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[260px] overflow-hidden opacity-80">
        <InkLandscape />
      </div>

      <SiteHeader
        sticky
        showNav={false}
        maxWidthClassName="max-w-[1120px]"
        actions={
          <>
            <Link href="/cases" className={HEADER_LINK}>
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

      <main className="relative z-10 mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-8">
        {/* PC：左盘面（吸顶）＋ 右解卦；移动端仍是单列中轴 */}
        <div className="grid gap-7 lg:grid-cols-[440px_minmax(0,1fr)] lg:items-start lg:gap-12">
          {/* 左：卦名 + 盘面（尺寸不变：卡片 440 / 爻盘 390 基准） */}
          <div className="lg:sticky lg:top-[86px]">
            <div className="pb-1 pt-5 text-center lg:pt-10">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <h1 className="font-song text-[26px] font-semibold leading-tight tracking-[0.16em] text-[#2F4438] sm:text-[32px] lg:text-[34px]">
                  {boardProps.hexagram_info.base_name}
                </h1>
                {changedName && (
                  <>
                    <span aria-hidden className="font-song text-[15px] text-[#8E6337]">
                      ⇌
                    </span>
                    <span className="font-song text-[21px] font-semibold tracking-[0.14em] text-[#2F4438] sm:text-[26px] lg:text-[28px]">
                      {changedName}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-2 font-song text-[11.5px] tabular-nums tracking-[0.04em] text-[#7C7668] lg:text-[12.5px]">
                公历：{solar}　·　{boardProps.datetime_info.ganzhi}
              </p>
                {/* 问事只在盘面里出现一次（卦单落款），页首不重复 */}

            </div>

            {/* 太极分隔 */}
            <div aria-hidden className="my-3 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-[#CBBFA8]/80" />
              <span className="font-song text-[13px] text-[#8E6337]">☯</span>
              <span className="h-px w-10 bg-[#CBBFA8]/80" />
            </div>

            {/* 盘面 */}
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

            {/* PC：动作按钮就在盘面下方（不再悬浮）；移动端见底部悬浮条 */}
            {showActionBar && (
              <div className="mx-auto mt-5 hidden w-full max-w-[440px] lg:block">
                <button
                  type="button"
                  onClick={streaming ? () => panelRef.current?.stop() : () => panelRef.current?.start()}
                  className={`${PRIMARY_BTN} w-full`}
                >
                  {streaming ? '停 止' : '解 卦'}
                </button>
              </div>
            )}
          </div>

          {/* 右：解卦正文（一张纸，读完像一页批注） */}
          <div className="min-w-0 lg:mt-6">
            <div
              className={`lg:min-h-[620px] lg:bg-[#FBF7EC]/70 lg:px-8 lg:py-8 ${
                phase === 'idle' ? 'lg:flex lg:flex-col lg:items-center lg:justify-center' : ''
              }`}
              style={{ borderRadius: 10, border: '1px solid rgba(179,160,125,0.38)' }}
            >
              <ReadingPanel
                ref={panelRef}
                facts={facts}
                hideIdleButton
                className="mt-5 lg:mt-0"
                onPhaseChange={setPhase}
              />
              {phase === 'idle' && (
                <div className="hidden flex-col items-center justify-center gap-3 py-16 text-center lg:flex lg:py-0">
                  <span aria-hidden className="font-song text-[15px] text-[#C0B49B]">
                    ☯
                  </span>
                  <p className="font-song text-[13.5px] leading-[2.2] tracking-[0.04em] text-[#8C8272]">
                    盘面已定，卦气在纸。
                    <br />
                    点盘面下方「解 卦」，依盘面事实作四段解读。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 底栏只承载「此刻唯一的动作」：解卦 / 停止；读完之后收起，让页面回到纯阅读 */}
      {showActionBar && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 bg-[#F4F1E8]/95 backdrop-blur-md lg:hidden">
          <div className="mx-auto w-full max-w-[640px] px-4 pt-2.5 sm:px-6" style={{ borderTop: '1px solid #DDD4BE' }}>
            <button
              type="button"
              onClick={streaming ? () => panelRef.current?.stop() : () => panelRef.current?.start()}
              className={`${PRIMARY_BTN} w-full`}
            >
              {streaming ? '停 止' : '解 卦'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, RotateCcw } from 'lucide-react';
import ResponsiveBoard from './ResponsiveBoard';
import ReadingPanel, { type ReadingPanelHandle } from './ReadingPanel';
import { Button } from '@/components/ui';
import type { BoardViewProps } from '@/lib/liuyao/board-view';
import type { LiuyaoReadingFacts } from '@/lib/readings/types';
import { parseUseGod, resolveUseGodLine } from '@/lib/liuyao/use-god';

export type ReadingPhase = 'idle' | 'streaming' | 'done' | 'error';

/**
 * 六爻结果页（S2 · 单列居中）
 * ==========================
 * 一块纸、一条中轴：卦名 → 干支 → 盘面（居中，按容器等比缩放）→ 用神 → 解卦。
 * 右上角「截图」把这块确定性盘面导出为 PNG（不做任何推断，只截纸）。
 * 底部固定：解卦 / 停止、保存、重起。
 */
export default function LiuyaoResult({
  boardProps,
  facts,
  question,
  onReset,
  onSave,
  saved,
  onSwitchXct,
}: {
  boardProps: BoardViewProps;
  facts: LiuyaoReadingFacts;
  question: string;
  onReset: () => void;
  onSave: () => Promise<void> | void;
  saved: boolean;
  onSwitchXct: () => void;
}) {
  const panelRef = useRef<ReadingPanelHandle | null>(null);
  const shotRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<ReadingPhase>('idle');
  const [text, setText] = useState('');
  const [shooting, setShooting] = useState(false);

  const useGod = useMemo(() => parseUseGod(text), [text]);
  const highlight = useMemo(() => {
    if (!useGod) return null;
    return resolveUseGodLine(
      useGod,
      facts.lines.map((l) => ({
        position: l.position,
        relation: l.relation,
        branch: l.najia.replace(/^[甲乙丙丁戊己庚辛壬癸]/, '').slice(0, 1),
        isWorld: l.isWorld,
        isResponse: l.isResponse,
      })),
    );
  }, [useGod, facts.lines]);

  const streaming = phase === 'streaming';

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

  return (
    <div className="min-h-screen bg-water-1 pb-28">
      {/* 顶栏：右上是截图 */}
      <header className="safe-top sticky top-0 z-20 bg-water-1/85 backdrop-blur-md">
        <div className="mx-auto flex h-[52px] w-full max-w-[560px] items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="press font-song text-[13px] text-ink-700 underline-offset-4 hover:underline">
              六爻
            </Link>
            <span className="text-ink-400">·</span>
            <button type="button" onClick={onSwitchXct} className="press font-song text-[13px] text-ink-700 underline-offset-4 hover:underline">
              小成图
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/cases" className="press text-[11.5px] text-ink-500 underline-offset-4 hover:underline">
              卦例
            </Link>
            <button
              type="button"
              onClick={() => void handleShot()}
              disabled={shooting}
              aria-label="截图确定性排盘"
              title="截图（确定性排盘）"
              className="press flex h-8 items-center gap-1.5 rounded-xs border border-line-strong px-2.5 text-[11.5px] text-ink-700 transition-colors hover:border-gold-500 hover:text-ink-900 disabled:opacity-50"
            >
              <Camera size={13} />
              {shooting ? '生成中' : '截图'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[560px] px-5">
        {/* 卦名：单列中轴 */}
        <div className="pb-3 pt-4 text-center">
          <div className="flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1">
            <h1 className="font-song text-[24px] font-semibold tracking-[0.12em] text-ink-900">
              {boardProps.hexagram_info.base_name}
            </h1>
            {boardProps.hexagram_info.changed_name &&
              boardProps.hexagram_info.changed_name !== boardProps.hexagram_info.base_name && (
                <>
                  <span className="font-kai text-[12px] text-gold-600">之</span>
                  <span className="font-song text-[18px] text-ink-800">{boardProps.hexagram_info.changed_name}</span>
                </>
              )}
          </div>
          <p className="mt-1.5 text-[11px] tabular-nums tracking-[0.04em] text-ink-500">
            {boardProps.datetime_info.ganzhi} · 旬空 {boardProps.datetime_info.void_branches.join('')}
          </p>
          {question.trim() && (
            <p className="mt-1 font-song text-[12.5px] text-ink-600">「{question.trim()}」</p>
          )}
        </div>

        {/* 盘面：一张纸，居中 */}
        <div
          ref={shotRef}
          className="mx-auto bg-paper-0 px-4 py-5 shadow-[0_2px_12px_rgba(58,70,74,0.09)]"
          style={{ borderRadius: 2, border: '1px solid var(--hairline)' }}
        >
          <ResponsiveBoard {...boardProps} highlightPosition={highlight} />
        </div>

        {useGod && (
          <p className="mt-2 text-center text-[11px] text-gold-600">
            用神 {useGod.excerpt}
            {highlight ? ` · 已标第 ${highlight} 爻` : ' · 六亲多现，未强指爻位'}
          </p>
        )}

        {/* 解卦 */}
        <div className="mt-5">
          <ReadingPanel
            ref={panelRef}
            facts={facts}
            hideIdleButton
            onTextChange={setText}
            onPhaseChange={setPhase}
          />
          {phase === 'idle' && (
            <div className="py-10 text-center">
              <p className="font-song text-[13px] leading-[2.1] text-ink-500">
                盘面已定，卦气在纸。
                <br />
                点下方「解 卦」，依盘面事实作四段解读。
              </p>
            </div>
          )}
        </div>
      </main>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 bg-water-1/92 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[560px] px-5 pt-2.5" style={{ borderTop: '1px solid var(--hairline)' }}>
          <div className="flex items-center gap-2">
            <Button variant="line" size="md" onClick={() => void onSave()} disabled={saved} className="!px-3">
              {saved ? '已存' : '保存'}
            </Button>
            <Button variant="line" size="md" onClick={onReset} className="!px-3" aria-label="重起一卦">
              <RotateCcw size={14} />
            </Button>
            {streaming ? (
              <Button variant="line" size="md" block onClick={() => panelRef.current?.stop()}>
                停 止
              </Button>
            ) : (
              <Button size="md" block onClick={() => panelRef.current?.start()} className="!bg-mist-900 hover:!bg-ink-900">
                {phase === 'idle' ? '解 卦' : '再解一次'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

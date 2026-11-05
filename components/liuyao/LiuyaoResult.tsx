'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import ResponsiveBoard from './ResponsiveBoard';
import ReadingPanel, { type ReadingPanelHandle } from './ReadingPanel';
import { AppBar, BottomBar, Button, Panel, Paper, Tag } from '@/components/ui';
import type { BoardViewProps } from '@/lib/liuyao/board-view';
import type { LiuyaoReadingFacts } from '@/lib/readings/types';
import { parseUseGod, resolveUseGodLine } from '@/lib/liuyao/use-god';

export type ReadingPhase = 'idle' | 'streaming' | 'done' | 'error';

/**
 * 六爻结果页（S2）
 * ===============
 * 版式：顶部一句落款 → 盘面（等比缩放，390 基准）→ 解卦 → 底部固定操作条。
 * 用神高亮：解卦正文第一段一旦写出取用，就在盘面上点亮那一爻（赭金左标 + 小字）。
 * 底部条是唯一的主操作位置：解卦 / 停止、复制、保存、重起。
 */
export default function LiuyaoResult({
  boardProps,
  facts,
  question,
  onReset,
  onCopy,
  onSave,
  saved,
  onSwitchXct,
}: {
  boardProps: BoardViewProps;
  facts: LiuyaoReadingFacts;
  question: string;
  onReset: () => void;
  onCopy: () => Promise<void> | void;
  onSave: () => Promise<void> | void;
  saved: boolean;
  onSwitchXct: () => void;
}) {
  const panelRef = useRef<ReadingPanelHandle | null>(null);
  const [phase, setPhase] = useState<ReadingPhase>('idle');
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="min-h-screen bg-paper-1 pb-28">
      <AppBar
        title={boardProps.hexagram_info.base_name}
        subtitle={`${boardProps.hexagram_info.palace ?? ''}宫 · ${boardProps.datetime_info.ganzhi.split(' ')[1] ?? ''}`}
        right={
          <div className="flex items-center gap-3 text-[11.5px] text-ink-500">
            <button type="button" onClick={onSwitchXct} className="press underline-offset-4 hover:text-ink-900">
              小成图
            </button>
            <Link href="/cases" className="press underline-offset-4 hover:text-ink-900">
              卦例
            </Link>
          </div>
        }
      />

      <main className="mx-auto w-full max-w-[520px] px-5 lg:max-w-[1080px] lg:px-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:items-start lg:gap-12">
          {/* 左：盘面 */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pt-5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-song text-[20px] font-semibold tracking-[0.08em] text-ink-900">
                  {boardProps.hexagram_info.base_name}
                </span>
                {boardProps.hexagram_info.changed_name &&
                  boardProps.hexagram_info.changed_name !== boardProps.hexagram_info.base_name && (
                    <>
                      <span className="text-[12px] text-ink-400">之</span>
                      <span className="font-song text-[16px] text-ink-800">
                        {boardProps.hexagram_info.changed_name}
                      </span>
                    </>
                  )}
              </div>
              <div className="flex items-center gap-3">
                {question.trim() && <Tag tone="ink">{question.trim().slice(0, 14)}</Tag>}
              </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
              <span className="tabular-nums">{boardProps.datetime_info.ganzhi}</span>
              <span className="text-ink-300">·</span>
              <span className="tabular-nums">旬空 {boardProps.datetime_info.void_branches.join('')}</span>
            </div>

            <Paper className="mt-3 !px-3 !py-3.5">
              <ResponsiveBoard {...boardProps} highlightPosition={highlight} />
            </Paper>

            {useGod && (
              <p className="mt-2 text-[11px] text-gold-600">
                用神 {useGod.excerpt}
                {highlight ? ` · 已标在第 ${highlight} 爻` : ' · 六亲多现，未强行指定爻位'}
              </p>
            )}
          </div>

          {/* 右：解卦 */}
          <div className="min-w-0 lg:pt-5">
            <ReadingPanel
              ref={panelRef}
              facts={facts}
              hideIdleButton
              onTextChange={setText}
              onPhaseChange={setPhase}
            />

            {phase === 'idle' && (
              <div className="mt-8 text-center lg:mt-16">
                <p className="font-song text-[13px] leading-[2] text-ink-500">
                  盘面已定，卦气在纸。
                  <br />
                  点击下方「解 卦」，依盘面事实作四段解读。
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomBar>
        <div className="flex items-center gap-2">
          <Button
            variant="line"
            size="md"
            onClick={async () => {
              await onCopy();
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
            className="!px-3"
          >
            {copied ? '已复制' : '复制'}
          </Button>
          <Button variant="line" size="md" onClick={() => void onSave()} disabled={saved} className="!px-3">
            {saved ? '已存' : '保存'}
          </Button>
          <Button
            variant="line"
            size="md"
            onClick={onReset}
            className="!px-3"
            aria-label="重起一卦"
          >
            <RotateCcw size={14} />
          </Button>
          {streaming ? (
            <Button variant="line" size="md" block onClick={() => panelRef.current?.stop()}>
              停 止
            </Button>
          ) : (
            <Button
              size="md"
              block
              onClick={() => panelRef.current?.start()}
            >
              {phase === 'idle' ? '解 卦' : '再解一次'}
            </Button>
          )}
        </div>
      </BottomBar>
    </div>
  );
}

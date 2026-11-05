'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { CoinResult } from './types';
import { HexagramSvg } from '@/components/hexagram/HexagramSvg';
import { masksOf, movingPositions, lineTitle } from '@/lib/hexagram/hex-math';
import { lookupByMask, resolveHexagramInfo } from '@/lib/hexagram/lookup';
import { tossLine, tossLines } from '@/lib/liuyao/random';
import { Coin } from './Coin';
import {
  advance,
  initialState as yarrowInitial,
  isComplete as yarrowComplete,
  isIdleSplit,
  previewBian,
  split as yarrowSplit,
  stickLayout,
  undo as yarrowUndo,
  TOTAL_STICKS,
  type YarrowPhase,
  type YarrowState,
} from '@/lib/zhanbu/yarrow';

export interface CastWorkbenchProps {
  onComplete: (values: CoinResult[]) => void;
  /** 十八变每定一爻回传一次，供父组件显示「已起 X / 6 爻」（三钱法仍按原样，完成后才回传） */
  onProgress?: (values: CoinResult[]) => void;
  disabled?: boolean;
  /** 起卦法：coin=三钱摇卦（默认），yarrow=大衍筮法十八变 */
  method?: 'coin' | 'yarrow';
}

export type CoinFace = 2 | 3; // 2=字(阴), 3=背(阳)

/**
 * 爻值 → 三枚币面（仅用于展示；真实结果由 random.ts 的加密随机决定）
 *
 * 字 = 2、背 = 3，三枚之和即爻值：
 *   6 老阴 = 字字字（0 背）· 7 少阳 = 背字字（1 背）
 *   8 少阴 = 背背字（2 背）· 9 老阳 = 背背背（3 背）
 */
export function coinFacesOf(value: number): [CoinFace, CoinFace, CoinFace] {
  switch (value) {
    case 6:
      return [2, 2, 2];
    case 7:
      return [3, 2, 2];
    case 8:
      return [3, 3, 2];
    case 9:
      return [3, 3, 3];
    default:
      return [2, 2, 2];
  }
}

/** 一变四步之间的推进节奏（ms），与 l1_tk.py 的 after() 链一致 */
const STEP_MS = 320;

/**
 * 首次进入引导的存档键。
 * v2：大衍筮法独立成页后另起一档 —— 老访客在新页面上仍会看到一次。
 */
const GUIDE_KEY = 'yarrow-guide-v2';

export default function CastWorkbench({
  onComplete,
  onProgress,
  disabled = false,
  method = 'coin',
}: CastWorkbenchProps) {
  const isYarrow = method === 'yarrow';

  // ───────── 三钱摇卦 ─────────
  const [values, setValues] = useState<CoinResult[]>([]);
  const [currentCoins, setCurrentCoins] = useState<[CoinFace, CoinFace, CoinFace]>([2, 3, 3]);
  const [isTossing, setIsTossing] = useState<boolean>(false);
  const tossTimeoutRef = useRef<number | null>(null);

  // ───────── 大衍筮法 · 十八变 ─────────
  const [yState, setYState] = useState<YarrowState>(yarrowInitial);
  const [yPending, setYPending] = useState<number>(Math.round(TOTAL_STICKS / 2));
  const [yPhase, setYPhase] = useState<YarrowPhase>('split');
  const [yBusy, setYBusy] = useState(false);
  /** 只在画布上点了一下、没拖动：闪一句提示，不落分二 */
  const [yIdleHint, setYIdleHint] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 首次进入的引导：一句话说清「分二」是什么，看过就不再出现 */
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => {
    // 放进宏任务里读 localStorage，避免在 effect 里同步 setState
    const t = setTimeout(() => {
      try {
        if (!localStorage.getItem(GUIDE_KEY)) setGuideOpen(true);
      } catch {
        /* 隐私模式下 localStorage 会抛错，静默跳过 */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const dismissGuide = useCallback(() => {
    setGuideOpen(false);
    try {
      localStorage.setItem(GUIDE_KEY, '1');
    } catch {
      /* 同上 */
    }
  }, []);
  const nudgeSplit = useCallback(() => {
    setYIdleHint(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setYIdleHint(false), 2200);
  }, []);
  useEffect(
    () => () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    },
    []
  );
  // 蓍草坛以弹窗呈现：进入蓍草法即开坛，收起后页内保留进度
  const timersRef = useRef<number[]>([]);
  const aliveRef = useRef(true);
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  // 清理计时器
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (tossTimeoutRef.current) window.clearTimeout(tossTimeoutRef.current);
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  /** 供十八变使用的可取消等待 */
  const wait = useCallback((ms: number) => {
    if (ms <= 0) return Promise.resolve();
    return new Promise<void>((res) => {
      const id = window.setTimeout(res, ms);
      timersRef.current.push(id);
    });
  }, []);

  // 当前法门的爻值与进度
  const activeValues: CoinResult[] = isYarrow ? yState.values : values;
  const castCount = activeValues.length;
  const isComplete = castCount === 6;

  // 计算当前掩码
  const { primary, moving } = masksOf(activeValues);

  // ───────── 三钱：单次投掷 ─────────
  const handleToss = () => {
    if (isTossing || isComplete || disabled) return;

    // 三枚铜钱：密码学级随机（Web Crypto），字 2 / 背 3 各半，无模偏差
    const sum = tossLine() as CoinResult;

    // 立即写入硬币与成爻数据，确保点击第 1 爻即刻跳出爻线与反馈
    setCurrentCoins(coinFacesOf(sum));
    setValues((prev) => [...prev, sum]);
    setIsTossing(true);

    if (tossTimeoutRef.current) window.clearTimeout(tossTimeoutRef.current);
    tossTimeoutRef.current = window.setTimeout(() => {
      setIsTossing(false);
    }, 550);
  };

  // 一键摇卦 / 一键成卦：快速完成余下所有爻位
  const handleQuickCast = () => {
    if (isComplete || disabled) return;
    const remaining = 6 - values.length;
    const newVals: CoinResult[] = [...values, ...(tossLines(remaining) as CoinResult[])];
    setCurrentCoins(coinFacesOf(newVals[newVals.length - 1]));
    setValues(newVals);
    setIsTossing(true);
    if (tossTimeoutRef.current) window.clearTimeout(tossTimeoutRef.current);
    tossTimeoutRef.current = window.setTimeout(() => {
      setIsTossing(false);
    }, 400);
  };

  const resetYarrow = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    setYState(yarrowInitial());
    setYPending(Math.round(TOTAL_STICKS / 2));
    setYPhase('split');
    setYBusy(false);
    onProgressRef.current?.([]);
  }, []);

  const handleReset = () => {
    if (tossTimeoutRef.current) window.clearTimeout(tossTimeoutRef.current);
    setValues([]);
    setCurrentCoins([2, 3, 3]);
    setIsTossing(false);
    resetYarrow();
  };

  // ───────── 十八变：一变四步 ─────────
  /**
   * 走完一变：分二 → 挂一 → 揲四 → 归奇。
   *
   * state 只写两次（分二后一次、一变毕一次），中间三步靠 phase 驱动，
   * 否则 React 批处理会把中间帧全部跳掉。
   */
  const runBian = useCallback(
    async (s0: YarrowState, left: number, delay: number): Promise<YarrowState> => {
      setYPending(left);
      let s = yarrowSplit(s0, left);
      setYState(s);
      setYPhase('split');
      await wait(delay);

      setYPhase('gua');
      await wait(delay);
      setYPhase('she');
      await wait(delay);
      setYPhase('gui');
      await wait(delay);

      s = advance(s);
      if (!aliveRef.current) return s;
      setYState(s);
      setYPending(Math.max(1, Math.round(s.sticks / 2)));
      setYPhase('split');
      if (s.values.length !== s0.values.length) onProgressRef.current?.(s.values);
      return s;
    },
    [wait]
  );

  /** 松手即确认：一次落点 = 一次分二，中间不再插确认按钮（空动作由 isIdleSplit 拦掉）。 */
  const commitSplit = useCallback(
    async (left: number) => {
      if (yBusy || disabled || yarrowComplete(yState)) return;
      setYBusy(true);
      await runBian(yState, left, STEP_MS);
      if (aliveRef.current) setYBusy(false);
    },
    [yBusy, disabled, yState, runBian]
  );

  const handleUndoYao = () => {
    if (yBusy || disabled || yState.values.length === 0) return;
    const back = yarrowUndo(yState);
    setYState(back);
    setYPending(Math.round(TOTAL_STICKS / 2));
    setYPhase('split');
    onProgressRef.current?.(back.values);
  };

  // 动爻位置
  const movingLines = movingPositions(activeValues).map((i) => i + 1); // 1-based

  // 卦名查询（优先从已有的 lookup 获取）
  const primaryInfo = lookupByMask(primary);
  const resultingInfo = lookupByMask(primary ^ moving);

  const primaryResolved = primaryInfo ? resolveHexagramInfo(primaryInfo.kw) : null;
  const resultingResolved = resultingInfo ? resolveHexagramInfo(resultingInfo.kw) : null;

  const latest = castCount > 0 ? activeValues[castCount - 1] : null;
  const latestYang = latest === 7 || latest === 9;
  const latestMoving = latest === 6 || latest === 9;
  const latestDesc =
    latest === 7
      ? '少阳（单 · 静）'
      : latest === 8
      ? '少阴（拆 · 静）'
      : latest === 9
      ? '老阳（重 · 动爻）'
      : '老阴（交 · 动爻）';

  /** 蓍草坛：版式对齐原版《周易》大衍之数·蓍草演卦（自成一页，直铺纸上） */
  const kNow = Math.max(1, Math.min(yState.sticks - 1, yPending));
  const pNow = previewBian(kNow, yState.sticks - kNow);
  // 恰尽者亦取四为扐（奇不得为零），面板上标出来，免得看着"24 根还余 4"犯疑
  const leftExact = kNow % 4 === 0;
  const rightExact = (yState.sticks - kNow - 1) % 4 === 0;
  const yaoIdx = Math.min(castCount + 1, 6);
  /** 十八变的总进度：一爻三变 */
  const doneSplits = Math.min(18, castCount * 3 + yState.bian);
  const yaoPos = ['初', '二', '三', '四', '五', '上'][yaoIdx - 1];
  const yaoName = latest === 6 ? '老阴' : latest === 7 ? '少阳' : latest === 8 ? '少阴' : latest === 9 ? '老阳' : '';
  const yaoChange = latest === 6 ? '（变阳）' : latest === 9 ? '（变阴）' : latest ? '（静）' : '';

  const yarrowAltar = (
    <div className="relative space-y-2.5">
      {/* 顶：走到第几变 + 这一下该做什么 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[12px] text-[#8B4513]">
            {isComplete ? '十八变毕' : `第${yaoIdx}爻（${yaoPos}）· 第${yState.bian + 1}变`}
          </span>
          {/* 十八变倒数：一个圈，圈里是还剩几变要分 */}
          <span
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-[#C0A165] bg-[#FDF8E8] font-sans text-[13px] font-bold tabular-nums text-[#A5342B]"
            aria-label={`十八变尚余 ${18 - doneSplits} 次`}
            title="尚余分蓍次数"
          >
            {18 - doneSplits}
          </span>
        </div>

        <p
          className="text-center text-[15px] font-medium leading-snug text-[#A5342B]"
          role={yIdleHint ? 'status' : undefined}
        >
          {isComplete
            ? '十八变毕，卦象已成'
            : yBusy
            ? '挂一 · 揲四 · 归奇…'
            : yIdleHint
            ? '要按住分割线拖一下 —— 松手才算分二'
            : '按住蓝色分割线左右拖动，松手即分二'}
        </p>

        <p className="text-center font-sans text-[12px] text-[#7A6B53]">
          {isComplete
            ? `余蓍 ${yState.sticks} 策`
            : `还要分 ${18 - doneSplits} 次 · 松手后挂一、揲四、归奇会自动走完`}
        </p>
      </div>

      {/* 主画布：只留蓍草与分割线 */}
      <div className="rounded-sm border border-[#C0A165] bg-[#FDF8E8] p-1">
        <div className="px-1 pt-1 pb-0.5">
          <YarrowPile
            sticks={yState.sticks}
            left={yPending}
            phase={yPhase}
            complete={isComplete}
            onChange={setYPending}
            onCommit={commitSplit}
            onIdleTap={nudgeSplit}
            disabled={yBusy || disabled || isComplete}
          />
        </div>
      </div>

      {/* 未成卦：一行读数（左堆 / 挂一 / 右堆 / 归奇 / 余策） */}
      {!isComplete && (
        <div className="space-y-1">
          {/* 左右手各占一行，与移动端同序：左 → 右 → 归奇，读起来是一条直线 */}
          <div className="space-y-0.5 text-center font-sans text-[12px] leading-relaxed text-[#5C5449]">
            <p>
              <span className="whitespace-nowrap tabular-nums">
                左手【天】{kNow} 根（余 {pNow.leftRemain}
                {leftExact && '，数尽取四'}）
              </span>
              <span className="mx-1.5 text-[#C0A165]">·</span>
              <span className="whitespace-nowrap">挂一 1</span>
            </p>
            <p>
              <span className="whitespace-nowrap tabular-nums">
                右手【地】{yState.sticks - kNow} 根（挂一后{' '}
                {Math.max(0, yState.sticks - kNow - 1)}，余 {pNow.rightRemain}
                {rightExact && '，数尽取四'}）
              </span>
            </p>
            <p className="whitespace-nowrap font-bold tabular-nums text-[#A5342B]">
              归奇 {pNow.removed} → 余 {yState.sticks - pNow.removed} 策
            </p>
          </div>

          <p className="text-center font-sans text-[11px] leading-relaxed text-[#8C8272]">
            <span className="whitespace-nowrap tabular-nums">
              {pNow.leftRemain} + 1（挂一）+ {pNow.rightRemain} = {pNow.removed}
            </span>
            <span className="hidden sm:inline">（一变非五即九，二三变非四即八）</span>
            <span className="mx-1.5 text-[#E0D2A5]">|</span>
            <span className="whitespace-nowrap">
              本爻归奇{' '}
              <span className="tabular-nums">
                {[...yState.gui, pNow.removed].map((g, k) => (
                  <span
                    key={k}
                    className={k === yState.gui.length ? 'font-bold text-[#A5342B]' : ''}
                  >
                    {k > 0 && ' → '}
                    {g}
                  </span>
                ))}
              </span>
            </span>
          </p>

          {latest ? (
            <p className="text-center font-sans text-[12px] text-[#8B4513]">
              第{castCount}爻（{['初', '二', '三', '四', '五', '上'][castCount - 1]}）得{' '}
              {latest}
              <span className="text-[#8C8272]">（余蓍 {latest * 4} 策 ÷ 4）</span>
              {' → '}
              {yaoName}
              {yaoChange}
            </p>
          ) : null}
        </div>
      )}

      {/* 已成卦：六爻得数一览（不再显示幻想的"下一变"） */}
      {isComplete && (
        <div className="rounded-sm border border-[#C0A165] bg-[#FDF8E8] px-3 py-3 text-center space-y-1.5">
          <div className="text-[12px] text-[#8B4513]">十八变毕 · 六爻得数</div>
          <div className="flex items-center justify-center gap-2 font-sans text-sm">
            {activeValues.map((v, i) => (
              <span key={i} className="inline-flex flex-col items-center">
                <span className="text-[10px] text-[#8C8272]">
                  {['初', '二', '三', '四', '五', '上'][i]}
                </span>
                <span className={v === 6 || v === 9 ? 'font-bold text-[#A5342B]' : 'text-[#17140F]'}>
                  {v}
                </span>
              </span>
            ))}
          </div>
          {primaryResolved && (
            <div className="text-[13px] font-bold text-[#17140F]">
              {primaryResolved.fullName}
              {movingLines.length > 0 && resultingResolved && (
                <>
                  <span className="mx-1 text-[#A5342B]">之</span>
                  {resultingResolved.fullName}
                </>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );

  // ───────── 大衍筮法：蓍草坛自成一页，直铺纸上（不再套弹窗） ─────────
  if (isYarrow) {
    return (
      <div className="w-full rounded-xl border border-[#E0D8C9] bg-[#FFFDF8] p-4 font-serif text-[#17140F] shadow-xs sm:p-6">
        {/* 首次进入：一句「分二」把这一下说清，点任意处开始 */}
        {guideOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="yarrow-guide-title"
              onClick={dismissGuide}
              className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-[#1F1A13]/35 px-5 backdrop-blur-[2px]"
            >
              <div className="w-full max-w-[340px] rounded-lg border border-[#C0A165] bg-[#FDF8E8] px-7 py-8 text-center shadow-2xl">
                <p className="text-[11px] tracking-[0.42em] text-[#A5342B]">分 二</p>
                <p
                  id="yarrow-guide-title"
                  className="mt-3 text-[17px] font-medium leading-relaxed text-[#1F1A13]"
                >
                  把四十九根蓍草随手分成两堆
                </p>
                <p className="mt-2 text-[13px] leading-[1.9] text-[#5C5449]">
                  怎么分都行。按住蓝线左右拖动，松手就算分完一次。
                </p>
                <button
                  type="button"
                  onClick={dismissGuide}
                  className="mt-6 cursor-pointer text-[11px] tracking-[0.2em] text-[#8C8272] transition-colors hover:text-[#A5342B]"
                >
                  点任意处开始
                </button>
              </div>
            </div>,
            document.body
          )}

        <div className="mx-auto w-full max-w-[560px] space-y-3">
          {yarrowAltar}

          {isComplete ? (
            <button
              type="button"
              onClick={() => onComplete(activeValues)}
              className="btn primary sm w-full font-serif tracking-widest cursor-pointer shadow-md active:scale-95 transition-all touch-manipulation"
            >
              六爻已齐 · 起局 →
            </button>
          ) : (
            castCount > 0 && (
              <div className="flex items-center justify-center gap-3 text-[11px] text-[#8C8272]">
                <button
                  type="button"
                  disabled={yBusy || disabled}
                  onClick={handleUndoYao}
                  className="cursor-pointer underline transition-colors hover:text-[#17140F] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  撤一爻
                </button>
                <span className="text-[#E0D8C9]">|</span>
                <button
                  type="button"
                  disabled={yBusy || disabled}
                  onClick={handleReset}
                  className="cursor-pointer underline transition-colors hover:text-[#17140F] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  重新起卦
                </button>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-md border border-line bg-paper-0 p-5 shadow-[0_1px_2px_rgba(31,42,48,0.05)] sm:p-7 font-serif text-ink-900">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* 左侧：起筮操作台 (7/12) */}
        <div className="md:col-span-7 flex flex-col justify-between items-center text-center space-y-4">
          {/* 进度指示 */}
          <div className="min-h-[26px] flex items-center justify-center text-xs tracking-wider">
            {castCount === 0 ? (
              <span className="text-[#5C5449] font-medium">
                点击掷币 · 六掷成卦（自下而上生成）
              </span>
            ) : !isComplete ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F3EA] border border-[#E0D8C9] px-3 py-1 text-xs text-[#5C5449]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#A5342B] animate-pulse" />
                <span>
                  已成 <strong className="text-[#17140F]">{castCount}</strong> 爻，尚余{' '}
                  <strong className="text-[#A5342B]">{6 - castCount}</strong> 爻
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#A5342B]/10 border border-[#A5342B]/20 px-3 py-1 text-xs text-[#A5342B] font-bold">
                <span>✓ 六爻已备 · 卦象圆成</span>
              </span>
            )}
          </div>

          {/* 三枚物理铜钱展示区 */}
          <div
            onClick={!isComplete && !isTossing && !disabled ? handleToss : undefined}
            className={`coins flex min-h-[118px] items-center justify-center gap-6 py-3 select-none ${
              !isComplete && !isTossing && !disabled ? 'cursor-pointer' : ''
            }`}
            title={!isComplete && !isTossing ? '点击掷钱' : undefined}
          >
            {currentCoins.map((face, idx) => (
              <Coin
                key={`${castCount}-${idx}`}
                side={face === 3 ? '背' : '字'}
                rolling={isTossing}
                delayMs={idx * 40}
                rotateDeg={[-9, 6, -4][idx] ?? 0}
              />
            ))}
          </div>

          {/* 投掷数学与爻象公式 */}
          <div className="min-h-[30px] flex items-center justify-center text-xs">
            {castCount === 0 ? (
              <p className="text-[#8C8272] tracking-wider font-sans">
                字面为 2（阴）· 背面为 3（阳）· 2+2+2=6(老阴) · 3+3+3=9(老阳)
              </p>
            ) : (
              <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-md border border-[#E0D8C9] bg-[#FAF8F1] px-3 py-1.5 text-[11.5px] leading-tight">
                <span className="font-bold text-[#17140F]">
                  第 {castCount} 爻（{lineTitle(castCount, latestYang)}）
                </span>
                <span className="text-[#8C8272]">·</span>
                <span className="text-[#5C5449] font-sans">点数和 = {latest}</span>
                <span className="text-[#8C8272]">·</span>
                <span className={latestMoving ? 'font-bold text-[#A5342B]' : 'text-[#5C5449]'}>
                  {latestDesc}
                </span>
                {latestMoving && (
                  <span className="rounded bg-[#A5342B]/15 px-1.5 py-0.2 text-[10px] font-bold text-[#A5342B]">
                    动
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="w-full flex flex-col items-center justify-center pt-2 gap-2">
            {!isComplete ? (
              <div className="w-full flex flex-col items-center gap-2">
                <button
                  type="button"
                  disabled={isTossing || disabled}
                  onClick={handleToss}
                  className="btn primary sm w-full max-w-[220px] font-serif tracking-widest cursor-pointer shadow-xs active:scale-95 transition-all touch-manipulation"
                >
                  {isTossing
                    ? '掷币中…'
                    : castCount === 0
                    ? '起 卦（初爻）→'
                    : `起第 ${castCount + 1} 爻 →`}
                </button>

                <button
                  type="button"
                  disabled={isTossing || disabled}
                  onClick={handleQuickCast}
                  className="text-xs font-serif text-[#8C8272] hover:text-[#A5342B] underline cursor-pointer transition-colors"
                >
                  一键起卦（连掷六爻）
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onComplete(activeValues)}
                className="btn primary sm w-full max-w-[220px] font-serif tracking-widest cursor-pointer shadow-md active:scale-95 transition-all touch-manipulation"
              >
                确立卦象 · 进入宗法排盘 →
              </button>
            )}

            {castCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="mt-1 text-xs text-[#8C8272] hover:text-[#17140F] underline cursor-pointer disabled:opacity-40"
              >
                重新起卦
              </button>
            )}
          </div>
        </div>

        {/* 右侧：纯几何爻象逐爻实时画布 (5/12) */}
        <div className="md:col-span-5 flex flex-col justify-between items-center border-t md:border-t-0 md:border-l border-[#E0D8C9] pt-4 md:pt-0 md:pl-6">
          <div className="w-full flex items-center justify-center gap-2 text-xs tracking-widest text-[#8C8272] mb-3">
            <span className="h-px w-6 bg-[#E0D8C9]" />
            <span>爻象生成台</span>
            <span className="h-px w-6 bg-[#E0D8C9]" />
          </div>

          <div className="py-2 flex flex-col items-center justify-center">
            <HexagramSvg
              mask={primary}
              movingMask={moving}
              width={110}
              filled={castCount}
              split={castCount === 6}
              stagger={castCount === 6}
            />
          </div>

          {/* 六爻圆成后的变卦对照 */}
          {isComplete && primaryResolved && (
            <div className="w-full mt-3 p-3 rounded-md bg-[#FAF8F1] border border-[#E0D8C9] text-xs text-center space-y-1.5">
              <div className="flex items-center justify-center gap-2 font-bold text-[#17140F]">
                <span>{primaryResolved.fullName}</span>
                {movingLines.length > 0 && resultingResolved && (
                  <>
                    <span className="text-[#A5342B]">之</span>
                    <span>{resultingResolved.fullName}</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-[#5C5449] leading-relaxed">
                {divinationGuidance(movingLines)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 朱熹六爻动变推演断法指引：按动爻数目取用（大衍、三钱两法共用） */
function divinationGuidance(movingLines: number[]): string {
  const count = movingLines.length;
  if (count === 0) return '六爻皆静（无动爻）：以本卦卦辞断，主吉凶基调安稳不变。';
  if (count === 1) return `一爻动（第 ${movingLines[0]} 爻动）：依古筮宗法，专以本卦此动爻之爻辞断事，直指核心机兆。`;
  if (count === 2) return `两爻动（第 ${movingLines.join('、')} 爻动）：以本卦两动爻爻辞合断，以上爻为主，下爻为辅。`;
  if (count === 3) return '三爻动：本卦与变卦卦辞合断，本卦为事之始（体），变卦为事之终（用）。';
  if (count === 4) return '四爻动：以变卦中两静爻之爻辞合断，以下爻为主。';
  if (count === 5) return '五爻动：以变卦中唯一静爻之爻辞断。';
  return '六爻皆动：乾看用九、坤看用六；其余诸卦专以变卦卦辞断事之全变。';
}

/* ─────────────── 蓍草画布（同文件内移植，版式对齐原版） ─────────────── */

/** 画布几何：间距按「当前策数」算，整列始终铺满（对齐原版 gap = TOP_W / n） */
const PILE_MARGIN = 26;
const PILE_VIEW_W = 880;
const PILE_VIEW_H = 208;
const PILE_TOP = 42;
const PILE_BOT = 186;

interface YarrowPileProps {
  sticks: number;
  left: number;
  phase: YarrowPhase;
  /** 六爻既备：画布定格为余蓍，不再分二 */
  complete?: boolean;
  disabled?: boolean;
  onChange?: (left: number) => void;
  onCommit?: (left: number) => void;
  /** 只点了一下没拖动：落点与按下点相同，不算一次分二 */
  onIdleTap?: () => void;
}

/**
 * 四十九策画布。
 *
 * 设计规范禁 Canvas，故以 SVG 绘制（与 HexagramSvg 同源）。
 * 版式照原版：阴/阳标于两侧，中置太极与左右引线，蓝色分割线贯串全策。
 * 指针事件三件套 + setPointerCapture + touch-none 是移动端最小可用集合，
 * 用 onMouseDown 在手机上会被页面滚动抢走。
 */
function YarrowPile({
  sticks,
  left,
  phase,
  complete = false,
  disabled,
  onChange,
  onCommit,
  onIdleTap,
}: YarrowPileProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  /** 按下时的落点（根数）：松手仍停在同一根，说明这一下没有"分"的意思 */
  const downK = useRef<number | null>(null);

  // 间距随手中策数变化：一变去蓍后仍铺满整幅，避免右侧空出一块把人的落点往左带
  const { step, xs, divider } = stickLayout(sticks, PILE_VIEW_W, PILE_MARGIN);
  // 策数少时间距变宽，线宽与策首圆点随之略增，疏密观感与原版一致
  const strokeW = Math.max(1.4, Math.min(2.4, step * 0.1));
  const dotR = Math.max(2.4, Math.min(3.6, step * 0.16));

  const xToK = useCallback(
    (clientX: number) => {
      const el = svgRef.current;
      if (!el) return left;
      const rect = el.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * PILE_VIEW_W;
      let best = 1;
      let bestD = Infinity;
      for (let i = 1; i <= sticks - 1; i++) {
        const d = Math.abs(divider(i) - x);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    },
    [left, sticks, divider]
  );

  const k = Math.max(1, Math.min(sticks - 1, left));
  const p = previewBian(k, sticks - k);

  // 挂一取右堆第一根（紧邻分割线），归奇则去左右两堆之末的扐数
  const guaIndex = k;
  const guaTook = !complete && (phase === 'gua' || phase === 'she' || phase === 'gui');

  const fadeSet = new Set<number>();
  if (!complete && phase === 'gui') {
    for (let i = Math.max(0, k - p.leftRemain); i < k; i++) fadeSet.add(i);
    for (let i = Math.max(k, sticks - p.rightRemain); i < sticks; i++) fadeSet.add(i);
    fadeSet.add(guaIndex);
  }

  const interactive = !disabled && !complete && phase === 'split';

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${PILE_VIEW_W} ${PILE_VIEW_H}`}
      className={`w-full h-auto select-none touch-none ${interactive ? 'cursor-ew-resize' : ''}`}
      role="img"
      aria-label={`蓍草 ${sticks} 根，左 ${k} 右 ${sticks - k}`}
      onPointerDown={(e) => {
        if (!interactive) return;
        dragging.current = true;
        downK.current = xToK(e.clientX);
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange?.(xToK(e.clientX));
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        onChange?.(xToK(e.clientX));
      }}
      onPointerUp={(e) => {
        if (!dragging.current) return;
        dragging.current = false;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
        const kUp = xToK(e.clientX);
        const idle = isIdleSplit(downK.current, kUp);
        downK.current = null;
        // 单击（按下即松开）不构成一次分二，见 isIdleSplit()
        if (idle) {
          onIdleTap?.();
          return;
        }
        onCommit?.(kUp); // 松手即确认
      }}
      onPointerCancel={() => {
        dragging.current = false;
        downK.current = null;
      }}
    >
      {/* 四十九策 */}
      {Array.from({ length: sticks }, (_, i) => {
        const x = xs[i];
        const fading = fadeSet.has(i);
        const isGua = guaTook && i === guaIndex;
        const lift = isGua && !fading;
        return (
          <g
            key={i}
            style={{
              opacity: fading ? 0 : 1,
              transform: lift ? 'translateY(-26px)' : fading ? 'translateY(30px)' : 'none',
              transition: 'opacity 260ms ease, transform 260ms ease',
            }}
          >
            {/* 投影：一根浅线错开一点，蓍草才有"放在席上"的厚度 */}
            <line
              x1={x + 1.3}
              y1={PILE_TOP + 2.5}
              x2={x + 1.3}
              y2={PILE_BOT + 2.5}
              stroke="#8B5E2A"
              strokeWidth={strokeW}
              strokeLinecap="round"
              opacity={0.14}
            />
            <line
              x1={x}
              y1={PILE_TOP}
              x2={x}
              y2={PILE_BOT}
              stroke={isGua ? '#A5342B' : '#B5651D'}
              strokeWidth={strokeW}
              strokeLinecap="round"
            />
            <circle
              cx={x}
              cy={PILE_TOP - 3}
              r={dotR}
              fill={isGua ? '#A5342B' : '#C0681F'}
            />
          </g>
        );
      })}

      {/* 蓝色分割线 */}
      {!complete && (
        <line
          x1={divider(k)}
          x2={divider(k)}
          y1={PILE_TOP - 16}
          y2={PILE_BOT + 18}
          stroke="#1565C0"
          strokeWidth={5}
          strokeLinecap="round"
          style={{ opacity: phase === 'split' ? 1 : 0.45, transition: 'opacity 180ms ease' }}
        />
      )}
    </svg>
  );
}

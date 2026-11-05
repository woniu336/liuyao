'use client';

/**
 * 小成图排盘（裁剪版）
 * ======================
 * 从 bazi-web `components/xct/XiaoChengTuView.tsx` 提取，保留：
 *   三种起卦（天地数 / 梅花时间 / 自定选卦）→ 八宫天盘 → 九宫四象八断 → 正推气路 → 盘面详录。
 * 移除：
 *   问句输入、类象用神选择、LLM 意图识别、专事公理、LLM 解盘（XctReadingPanel）、
 *   以及一切把「问什么」翻译成「用神在哪一宫」的链路。
 *
 * 正推起点因此改为**读者点选的宫位**（默认中宫立极），不再由用神决定。
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/site/SiteHeader';
import { Star } from 'lucide-react';
import { Lunar } from 'lunar-javascript';
import NinePalaceBoard from './NinePalaceBoard';
import HexagramFigure from './HexagramFigure';
import ZhengTuiPathView from './ZhengTuiPathView';
import ReportView from './ReportView';
import FoldSection from './FoldSection';
import type { BoardState, PalaceJudgment, PalaceNumber, Trigram, ZhengTuiChain } from '@/lib/xct/types';
import {
  buildBoardFromManualTrigrams,
  buildBoardFromMeihuaTime,
  buildBoardFromTianDiNumbers,
  getDivinationTimeInfo,
} from '@/lib/xct/boardBuilder';
import { judgeFullBoard } from '@/lib/xct/judgeEngine';
import { traceZhengTuiChain } from '@/lib/xct/dagTracker';
import { ALL_TRIGRAMS, PALACE_NAMES, SIXTY_FOUR_HEXAGRAMS, XIAN_TIAN_NUMBER } from '@/lib/xct/constants';
import { secureDigits } from '@/lib/liuyao/random';
import { decodeCastState } from '@/lib/liuyao/cast-url';
import { structureFromCoins } from '@/lib/xct/yi-bian';
import { getCaseStore } from '@/lib/store';
import { buildXctRecord } from '@/lib/cases/record';

type CastMode = 'four' | 'time' | 'self';

const MODES: { id: CastMode; label: string }[] = [
  { id: 'four', label: '天地数起卦' },
  { id: 'time', label: '时间起卦' },
  { id: 'self', label: '自定选卦' },
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function nowLocalInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function XiaoChengTuView() {
  const [method, setMethod] = useState<CastMode>('four');

  // 天地数起卦
  const [tianDiNums, setTianDiNums] = useState<[string, string, string, string]>(['', '', '', '']);
  const tianDiRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const rollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 时间起卦
  const [selectedTime, setSelectedTime] = useState<string>(() => nowLocalInput());

  // 自定选卦
  const [manualBenUpper, setManualBenUpper] = useState<Trigram>('乾');
  const [manualBenLower, setManualBenLower] = useState<Trigram>('兑');
  const [manualZhiUpper, setManualZhiUpper] = useState<Trigram>('离');
  const [manualZhiLower, setManualZhiLower] = useState<Trigram>('坤');

  const [board, setBoard] = useState<BoardState | null>(null);
  const [judgments, setJudgments] = useState<Record<PalaceNumber, PalaceJudgment> | null>(null);
  const [chain, setChain] = useState<ZhengTuiChain | null>(null);
  const [activePalace, setActivePalace] = useState<PalaceNumber>(5);
  const [movingYao, setMovingYao] = useState<number | null>(null);
  const [timeDisplay, setTimeDisplay] = useState<ReturnType<typeof getDivinationTimeInfo> | null>(null);
  const [notice, setNotice] = useState('');
  const [castSnapshot, setCastSnapshot] = useState<{
    method: CastMode;
    tianDiNums?: [string, string, string, string];
    timeDate?: string;
    manual?: { benUpper: Trigram; benLower: Trigram; zhiUpper: Trigram; zhiLower: Trigram };
    timeInput: string;
  } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
    };
  }, []);

  const timePreview = useMemo(() => {
    try {
      const d = selectedTime ? new Date(selectedTime) : new Date();
      const validDate = isNaN(d.getTime()) ? new Date() : d;
      const lunar = Lunar.fromDate(validDate) as any;
      const YEAR_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      const yearZhi = lunar.getYearZhiExact();
      const yearZhiNum = YEAR_ZHI.indexOf(yearZhi) + 1;
      const lunarMonth = Math.abs(lunar.getMonth());
      const lunarDay = lunar.getDay();
      const hourZhi = lunar.getTimeZhi();
      const hourZhiNum = YEAR_ZHI.indexOf(hourZhi) + 1;

      const upperSum = yearZhiNum + lunarMonth + lunarDay;
      const upperRem = upperSum % 8 === 0 ? 8 : upperSum % 8;
      const lowerSum = upperSum + hourZhiNum;
      const lowerRem = lowerSum % 8 === 0 ? 8 : lowerSum % 8;
      const moving = lowerSum % 6 === 0 ? 6 : lowerSum % 6;

      return {
        solarDateStr: `${validDate.getFullYear()}年${validDate.getMonth() + 1}月${validDate.getDate()}日 ${pad(validDate.getHours())}:${pad(validDate.getMinutes())}`,
        ganzhiStr: `${lunar.getYearInGanZhiExact()}年 ${lunar.getMonthInGanZhiExact()}月 ${lunar.getDayInGanZhiExact()}日 ${lunar.getTimeInGanZhi()}时`,
        lunarStr: `${lunar.getYearInChinese()}年 农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
        yearZhi,
        yearZhiNum,
        lunarMonth,
        lunarDay,
        hourZhi,
        hourZhiNum,
        upperRem,
        lowerRem,
        movingYao: moving,
      };
    } catch {
      return null;
    }
  }, [selectedTime]);

  // 天地数输入
  const handleTianDiKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...tianDiNums] as [string, string, string, string];
      if (next[idx]) next[idx] = '';
      else if (idx > 0) {
        next[idx - 1] = '';
        tianDiRefs.current[idx - 1]?.focus();
      }
      setTianDiNums(next);
      return;
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      tianDiRefs.current[idx - 1]?.focus();
      return;
    }
    if (e.key === 'ArrowRight' && idx < 3) {
      e.preventDefault();
      tianDiRefs.current[idx + 1]?.focus();
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const next = [...tianDiNums] as [string, string, string, string];
      next[idx] = e.key;
      setTianDiNums(next);
      if (idx < 3) tianDiRefs.current[idx + 1]?.focus();
    }
  };

  const handleTianDiPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').trim();
    let tokens: string[] = [];
    if (/[\s,，、/|-]/.test(text)) tokens = text.split(/[\s,，、/|-]+/).filter(Boolean);
    else {
      for (let i = 0; i < text.length && tokens.length < 4; i += 1) {
        if (/^[0-9]$/.test(text[i])) tokens.push(text[i]);
      }
    }
    if (!tokens.length) return;
    const next = [...tianDiNums] as [string, string, string, string];
    for (let i = 0; i < Math.min(4, tokens.length); i += 1) {
      const num = Number(tokens[i]);
      if (!Number.isNaN(num) && num >= 0 && num <= 9) next[i] = String(num);
    }
    setTianDiNums(next);
    tianDiRefs.current[Math.min(3, tokens.length)]?.focus();
  };

  const handleStartRolling = () => {
    setIsRolling(true);
    if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
    rollingIntervalRef.current = setInterval(() => {
      setTianDiNums(secureDigits(4) as [string, string, string, string]);
    }, 50);
  };

  const handleStopRolling = () => {
    if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
    rollingIntervalRef.current = null;
    setTianDiNums(secureDigits(4) as [string, string, string, string]);
    setIsRolling(false);
  };

  const selectPalace = (p: PalaceNumber) => {
    if (!board) return;
    setActivePalace(p);
    setChain(traceZhengTuiChain(board, p));
  };

  interface CastOverride {
    method?: CastMode;
    tianDiNums?: [string, string, string, string];
    timeDate?: string;
    manual?: { benUpper: Trigram; benLower: Trigram; zhiUpper: Trigram; zhiLower: Trigram };
  }

  /** 起盘；从历史排盘复原时用 override 直接给值（setState 是异步的，不能读完再算） */
  const runCast = (override?: CastOverride) => {
    setNotice('');
    try {
      const curMethod = override?.method ?? method;
      const curNums = override?.tianDiNums ?? tianDiNums;
      const curTime = override?.timeDate ?? selectedTime;
      const curManual =
        override?.manual ?? {
          benUpper: manualBenUpper,
          benLower: manualBenLower,
          zhiUpper: manualZhiUpper,
          zhiLower: manualZhiLower,
        };

      const castTimeInput = curMethod === 'time' ? curTime || nowLocalInput() : nowLocalInput();
      let nextBoard: BoardState;
      let nextMoving: number | null = null;

      if (curMethod === 'four') {
        if (curNums.some((v) => v === '' || !/^[0-9]$/.test(v))) {
          setNotice('请先报入天地四数（各 0–9），或点击「一键随机报数」');
          return;
        }
        nextBoard = buildBoardFromTianDiNumbers(curNums.map((v) => Number(v)) as [number, number, number, number]);
      } else if (curMethod === 'time') {
        const res = buildBoardFromMeihuaTime(castTimeInput);
        nextBoard = res.board;
        nextMoving = res.movingYao;
      } else {
        nextBoard = buildBoardFromManualTrigrams(
          curManual.benUpper,
          curManual.benLower,
          curManual.zhiUpper,
          curManual.zhiLower,
        );
      }

      const nextJudgments = judgeFullBoard(nextBoard);
      const startPalace: PalaceNumber = 5;
      setBoard(nextBoard);
      setJudgments(nextJudgments);
      setMovingYao(nextMoving);
      setActivePalace(startPalace);
      setChain(traceZhengTuiChain(nextBoard, startPalace));
      setTimeDisplay(getDivinationTimeInfo(castTimeInput));
      setCastSnapshot({
        method: curMethod,
        ...(curMethod === 'four' ? { tianDiNums: curNums } : {}),
        ...(curMethod === 'time' ? { timeDate: castTimeInput } : {}),
        ...(curMethod === 'self' ? { manual: curManual } : {}),
        timeInput: castTimeInput,
      });
      setSavedId(null);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    }
  };

  // 从历史排盘打开：?case=<id>
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const params = new URLSearchParams(window.location.search);

    // 起卦页传来的同一卦：由六爻三钱结果立小成图盘（含静卦的宜变法）
    const cast = decodeCastState(params);
    if (cast) {
      const structure = structureFromCoins(cast.coins);
      const manual = {
        benUpper: structure.ben.upper,
        benLower: structure.ben.lower,
        zhiUpper: structure.zhi.upper,
        zhiLower: structure.zhi.lower,
      };
      setMethod('self');
      setManualBenUpper(manual.benUpper);
      setManualBenLower(manual.benLower);
      setManualZhiUpper(manual.zhiUpper);
      setManualZhiLower(manual.zhiLower);
      setSelectedTime(cast.timeInput);
      runCast({ method: 'self', manual, timeDate: cast.timeInput });
      return;
    }

    const id = params.get('case');
    if (!id) return;
    void (async () => {
      const store = await getCaseStore();
      const record = await store.get(id);
      if (!record || record.kind !== 'xct' || record.input.kind !== 'xct') {
        setNotice('该记录不存在或类型不符');
        return;
      }
      const inp = record.input;
      if (inp.timeDate) setSelectedTime(inp.timeDate);
      if (inp.tianDiNums) setTianDiNums(inp.tianDiNums);
      if (inp.manual) {
        setManualBenUpper(inp.manual.benUpper as Trigram);
        setManualBenLower(inp.manual.benLower as Trigram);
        setManualZhiUpper(inp.manual.zhiUpper as Trigram);
        setManualZhiLower(inp.manual.zhiLower as Trigram);
      }
      setMethod(inp.method);
      runCast({
        method: inp.method,
        tianDiNums: inp.tianDiNums,
        timeDate: inp.timeDate,
        manual: inp.manual
          ? {
              benUpper: inp.manual.benUpper as Trigram,
              benLower: inp.manual.benLower as Trigram,
              zhiUpper: inp.manual.zhiUpper as Trigram,
              zhiLower: inp.manual.zhiLower as Trigram,
            }
          : undefined,
      });
    })();
    // runCast 每次渲染都是新函数，靠 restoredRef 保证只跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!board || !castSnapshot) return;
    try {
      const record = buildXctRecord({
        benName: SIXTY_FOUR_HEXAGRAMS[board.ben.upper][board.ben.lower],
        zhiName: SIXTY_FOUR_HEXAGRAMS[board.zhi.upper][board.zhi.lower],
        center: board.center,
        timeInput: castSnapshot.timeInput,
        method: castSnapshot.method,
        tianDiNums: castSnapshot.tianDiNums,
        timeDate: castSnapshot.timeDate,
        manual: castSnapshot.manual,
      });
      const store = await getCaseStore();
      await store.save(record);
      setSavedId(record.id);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    }
  };

  const handleReset = () => {
    setBoard(null);
    setJudgments(null);
    setChain(null);
    setNotice('');
    setTianDiNums(['', '', '', '']);
    setIsRolling(false);
    setCastSnapshot(null);
    setSavedId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ───────────────────────── 结果页 ─────────────────────────
  if (board && judgments) {
    const chainPath = chain ? chain.path.map((p) => PALACE_NAMES[p].slice(0, 2)).join(' → ') : '';
    const chainEnd = chain
      ? chain.endReason === 'guiwei'
        ? '归位'
        : chain.hasCycle
          ? '闭环'
          : chain.endReason === 'center'
            ? '归藏'
            : ''
      : '';
    const benName = SIXTY_FOUR_HEXAGRAMS[board.ben.upper][board.ben.lower];
    const zhiName = SIXTY_FOUR_HEXAGRAMS[board.zhi.upper][board.zhi.lower];

    return (
      <div className="min-h-screen bg-[#F4F1E8] pb-32 text-[#38423C]">
        <SiteHeader
          active="xct"
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
                onClick={() => void handleSave()}
                disabled={Boolean(savedId)}
                title={savedId ? '已存入历史排盘' : '保存起卦输入，随时重排'}
                className={`press flex h-8 items-center gap-1.5 rounded-full border px-3 font-song text-[12px] transition-colors ${
                  savedId
                    ? 'cursor-default border-[#DDD4BE] bg-[#FCF9F0]/60 text-[#A79C8A]'
                    : 'border-[#C3B79E] bg-[#FCF9F0]/70 text-[#4A4438] hover:border-[#9A7040] hover:text-[#8E6337]'
                }`}
              >
                <Star size={13} strokeWidth={1.7} fill={savedId ? 'currentColor' : 'none'} />
                {savedId ? '已存入' : '存入历史'}
              </button>
            </>
          }
        />

        <main ref={resultRef} className="relative z-10 mx-auto w-full max-w-[640px] px-4 sm:px-6">
          {/* 卦名 */}
          <div className="pb-1 pt-5 text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <h1 className="font-song text-[24px] font-semibold leading-tight tracking-[0.16em] text-[#2F4438] sm:text-[29px]">
                {benName}
              </h1>
              <span aria-hidden className="font-song text-[15px] text-[#8E6337]">
                ⇌
              </span>
              <span className="font-song text-[20px] font-semibold tracking-[0.14em] text-[#2F4438] sm:text-[24px]">
                {zhiName}
              </span>
            </div>
            {timeDisplay && (
              <p className="mt-2 font-song text-[11.5px] tabular-nums tracking-[0.04em] text-[#7C7668]">
                {timeDisplay.solarDateStr}　·　{timeDisplay.ganzhiStr}
              </p>
            )}
          </div>

          <div aria-hidden className="my-3 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-[#CBBFA8]/80" />
            <span className="font-song text-[13px] text-[#8E6337]">☯</span>
            <span className="h-px w-10 bg-[#CBBFA8]/80" />
          </div>

          {/* 卦象纸 */}
          <div
            className="mx-auto w-full bg-[#FBF7EC] px-4 py-4 sm:px-5"
            style={{
              borderRadius: 10,
              border: '1px solid rgba(179,160,125,0.55)',
              boxShadow: '0 8px 24px rgba(64,69,60,0.08)',
            }}
          >
            <div className="flex select-none items-start justify-center gap-7 sm:gap-10">
              <HexagramFigure hex={board.ben} label="本卦" />
              <div className="flex flex-col items-center gap-2 pt-[42px]">
                <span className="h-6 w-px bg-[#DED6C6]" />
                <span className="font-song text-[12px] tracking-[0.1em] text-[#5E5A50]">之</span>
                <span className="h-6 w-px bg-[#DED6C6]" />
              </div>
              <HexagramFigure hex={board.zhi} label="变卦" accent />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-[#E3DAC6] pt-3 font-song text-[11.5px] text-[#6E6A5C]">
              <span>
                起卦法门　
                <span className="text-[#3F5145]">
                  {castSnapshot?.method === 'four' ? '天地数' : castSnapshot?.method === 'time' ? '梅花时间' : '自定选卦'}
                </span>
              </span>
              <span aria-hidden className="text-[#C0B49B]">·</span>
              <span>
                中五归藏　<span className="text-[#3F5145]">{board.heaven[5]}</span>
              </span>
              {movingYao && (
                <>
                  <span aria-hidden className="text-[#C0B49B]">·</span>
                  <span>
                    动爻　<span className="text-[#3F5145]">第 {movingYao} 爻</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 九宫 */}
          <div className="mt-4">
            <NinePalaceBoard judgments={judgments} activePalace={activePalace} onSelectPalace={selectPalace} />
          </div>
          <p className="mt-2 text-center font-song text-[11px] tracking-[0.04em] text-[#8C8272]">
            点击任一宫位，即以该宫为起点重算正推气路（无问句、无自动取用）。
          </p>

          {/* 折叠：正推与详录（只列盘面事实，不给吉凶断语） */}
          {chain && (
            <div className="mt-4">
              <FoldSection title="正推演化" summary={chainPath}>
                <ZhengTuiPathView chain={chain} board={board} activePalace={activePalace} onSelectPalace={selectPalace} />
              </FoldSection>
              <FoldSection title="盘面详录" summary={`八宫布毕 · 中五归藏${board.heaven[5] || ''}`}>
                <ReportView
                  board={board}
                  selectedJudgment={judgments[activePalace]}
                  chain={chain}
                  divineTimeInfo={timeDisplay}
                />
              </FoldSection>
            </div>
          )}
        </main>

        <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 bg-[#F4F1E8]/95 backdrop-blur-md">
          <div className="mx-auto w-full max-w-[640px] px-4 pt-2.5 sm:px-6" style={{ borderTop: '1px solid #DDD4BE' }}>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleReset}
                className="press inline-flex h-12 shrink-0 items-center justify-center rounded-[3px] border border-[#C3B79E] bg-[#FBF7EC] px-5 font-song text-[14px] tracking-[0.16em] text-[#3F4A42] transition-colors hover:border-[#9A7040] hover:text-[#8E6337]"
              >
                重新起卦
              </button>
              <button
                type="button"
                onClick={() => {
                  const qs = new URLSearchParams(window.location.search);
                  window.location.href = qs.get('c') && qs.get('t') ? `/liuyao?${qs.toString()}` : '/liuyao';
                }}
                className="press inline-flex h-12 flex-1 items-center justify-center rounded-[3px] border border-[#D8C392]/50 bg-[linear-gradient(180deg,#456557_0%,#29453B_100%)] px-4 font-song text-[14px] tracking-[0.16em] text-[#F5E9CB] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-colors hover:bg-[#223D34]"
              >
                切换到六爻排盘
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────── 起卦表单 ─────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#38423C]">
      <SiteHeader
        active="xct"
        actions={
          <Link
            href="/cases"
            className="font-song text-[12.5px] tracking-[0.06em] text-[#5E5A50] underline-offset-4 transition-colors hover:text-[#8E6337] hover:underline"
          >
            历史排盘
          </Link>
        }
      />
      <div className="mx-auto w-full max-w-[600px] px-4 pb-24 pt-7 sm:pt-10">
      <header className="space-y-1.5 pb-1 text-center">
        <h1 className="font-song text-[28px] font-semibold leading-tight tracking-[0.22em] text-[#2F4438] sm:text-[32px]">
          小成图
        </h1>
        <div className="flex items-center justify-center gap-2.5 font-kai text-[12px] tracking-[0.16em] text-[#96794F] sm:text-[13px]">
          <span className="h-px w-8 bg-[#C8BEA8] sm:w-12" />
          <span>阖辟往来 · 正推因果</span>
          <span className="h-px w-8 bg-[#C8BEA8] sm:w-12" />
        </div>
      </header>

      {notice && (
        <div className="mt-4 w-full rounded-[3px] border border-[#d9a99f] bg-[#fdf2ef] p-2.5 text-center font-serif text-[11.5px] text-[#8e3a2c]">
          {notice}
        </div>
      )}

      <div className="mt-5 w-full space-y-4 rounded-[4px] border border-[#DED4BE] bg-[#FCF9F0] p-4 shadow-[0_1px_6px_rgba(23,20,15,0.04)] sm:p-5">
        {/* 起卦法门 */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[12px] font-bold text-[#2F4438]">起卦方式</span>
            <span className="font-serif text-[11px] text-[#8C8272]">
              {method === 'four' ? '随口四数成卦' : method === 'time' ? '梅花时空成卦' : '直选八卦成卦'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 rounded-[4px] border border-[#DED4BE]/80 bg-[#F0EBE1]/70 p-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`h-9 cursor-pointer rounded-[3px] font-serif text-[12px] transition-colors ${
                  method === m.id
                    ? 'bg-[#3F5B4B] font-semibold text-white shadow-sm'
                    : 'text-[#4A4438] hover:bg-[#FAF8F1]/80 hover:text-[#2F4438]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 天地数 */}
        {method === 'four' && (
          <div className="space-y-3 border-t border-[#EFE8D8] pt-3">
            <span className="block font-serif text-[11px] text-[#8C8272]">随口报四数（0 至 9）：</span>
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
              {(['本卦上', '本卦下', '之卦上', '之卦下'] as const).map((label, idx) => (
                <div key={label} className="text-center">
                  <input
                    ref={(el) => {
                      tianDiRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={tianDiNums[idx]}
                    onKeyDown={(e) => handleTianDiKeyDown(idx, e)}
                    onPaste={handleTianDiPaste}
                    onChange={() => {}}
                    aria-label={label}
                    className={`h-12 w-full select-all rounded-[3px] border bg-white py-1.5 text-center font-serif text-lg font-bold text-[#2F4438] outline-none transition-all ${
                      isRolling
                        ? 'scale-[1.02] border-[#3F5B4B] bg-[#F4F8F3] text-[#3F5B4B]'
                        : 'border-[#DED4BE] focus:border-[#3F5B4B]'
                    }`}
                  />
                  <span className="mt-1 block font-serif text-[10px] text-[#8C8272] sm:text-[11px]">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center pt-1">
              {!isRolling ? (
                <button
                  type="button"
                  onClick={handleStartRolling}
                  className="cursor-pointer rounded-[4px] border border-[#DED4BE] bg-[#FAF6EC] px-4 py-1.5 font-serif text-[12px] tracking-wider text-[#3F4A42] shadow-sm transition-all hover:bg-[#EFE8D8] hover:text-[#2F4438] active:scale-95"
                >
                  一键随机报数
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleStopRolling}
                    className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-[#8E302D]/60 bg-[#FDFBF7] font-serif text-2xl font-bold text-[#8E302D] shadow-md transition-transform hover:scale-105 active:scale-95 sm:h-16 sm:w-16"
                    title="点击定格四数"
                  >
                    <span>停</span>
                  </button>
                  <span className="font-serif text-[11px] tracking-wider text-[#8E302D]/70">数字翻滚中 · 点击「停」定格</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 时间起卦 */}
        {method === 'time' && (
          <div className="space-y-3 border-t border-[#EFE8D8] pt-3">
            <div className="flex items-center justify-between">
              <span className="font-serif text-[11px] text-[#8C8272]">以天时通神，依农历年月日时推衍成卦：</span>
              <button
                type="button"
                onClick={() => setSelectedTime(nowLocalInput())}
                className="cursor-pointer font-serif text-[11px] text-[#3F5B4B] underline hover:text-[#2F4438]"
              >
                取当前系统时刻
              </button>
            </div>
            <input
              type="datetime-local"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              aria-label="起卦时间"
              className="h-11 w-full rounded-[3px] border border-[#DED4BE] bg-white px-3 font-serif text-[13px] text-[#2F4438] outline-none focus:border-[#3F5B4B]"
            />
            {timePreview && (
              <div className="space-y-2 rounded-[3px] border border-[#DED4BE] bg-[#FCF9F0] p-3 font-serif text-[11.5px]">
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#EAE2D0] pb-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[#8C8272]">
                      公历：<span className="font-sans font-medium text-[#2F4438]">{timePreview.solarDateStr}</span>
                    </span>
                    <span className="hidden text-[#DED4BE] sm:inline">|</span>
                    <span className="font-bold text-[#2F4438]">干支：{timePreview.ganzhiStr}</span>
                  </div>
                  <span className="text-[10.5px] text-[#8C8272]">{timePreview.lunarStr}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
                  <div className="rounded border border-[#EAE2D0] bg-white p-1.5">
                    <span className="block text-[10px] text-[#8C8272]">上卦（年+月+日）</span>
                    <span className="mt-0.5 block text-[13px] font-bold text-[#3F5B4B]">
                      余 {timePreview.upperRem} · {XIAN_TIAN_NUMBER[timePreview.upperRem]}卦
                    </span>
                  </div>
                  <div className="rounded border border-[#EAE2D0] bg-white p-1.5">
                    <span className="block text-[10px] text-[#8C8272]">下卦（加时辰支）</span>
                    <span className="mt-0.5 block text-[13px] font-bold text-[#3F5B4B]">
                      余 {timePreview.lowerRem} · {XIAN_TIAN_NUMBER[timePreview.lowerRem]}卦
                    </span>
                  </div>
                  <div className="rounded border border-[#EAE2D0] bg-white p-1.5">
                    <span className="block text-[10px] text-[#8C8272]">动爻（总和÷6）</span>
                    <span className="mt-0.5 block text-[13px] font-bold text-[#8E6337]">
                      第 {timePreview.movingYao} 爻变
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 自定选卦 */}
        {method === 'self' && (
          <div className="space-y-2 border-t border-[#EFE8D8] pt-3">
            <span className="block font-serif text-[11px] text-[#8C8272]">直选本卦之卦上下卦：</span>
            <div className="grid grid-cols-2 gap-1.5 font-serif text-[11px] sm:grid-cols-4">
              {(
                [
                  ['本卦上卦', manualBenUpper, setManualBenUpper, 'ben-upper'],
                  ['本卦下卦', manualBenLower, setManualBenLower, 'ben-lower'],
                  ['之卦上卦', manualZhiUpper, setManualZhiUpper, 'zhi-upper'],
                  ['之卦下卦', manualZhiLower, setManualZhiLower, 'zhi-lower'],
                ] as const
              ).map(([label, value, setter, id]) => (
                <div key={id}>
                  <label htmlFor={id} className="mb-0.5 block text-[#8C8272]">
                    {label}
                  </label>
                  <select
                    id={id}
                    value={value}
                    onChange={(e) => (setter as (t: Trigram) => void)(e.target.value as Trigram)}
                    className="w-full rounded border border-[#DED4BE] bg-white p-1.5 text-[12px]"
                  >
                    {ALL_TRIGRAMS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center border-t border-[#EFE8D8] pt-3">
          <button
            type="button"
            disabled={isRolling}
            onClick={() => runCast()}
            className="press flex h-12 w-full max-w-[240px] select-none cursor-pointer items-center justify-center rounded-[3px] border border-[#D8C392]/50 bg-[linear-gradient(180deg,#456557_0%,#29453B_100%)] px-6 font-song text-[15px] tracking-[0.2em] text-[#F5E9CB] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-colors hover:bg-[#223D34] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRolling ? '数字翻滚中…' : '排 盘 →'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

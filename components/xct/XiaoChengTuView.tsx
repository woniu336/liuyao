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
import { RotateCcw, Star } from 'lucide-react';
import { Lunar } from 'lunar-javascript';
import NinePalaceBoard from './NinePalaceBoard';
import HexagramFigure from './HexagramFigure';
import ZhengTuiPathView from './ZhengTuiPathView';
import ReportView from './ReportView';
import VerdictCard from './VerdictCard';
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
      setTianDiNums([
        String(Math.floor(Math.random() * 10)),
        String(Math.floor(Math.random() * 10)),
        String(Math.floor(Math.random() * 10)),
        String(Math.floor(Math.random() * 10)),
      ]);
    }, 50);
  };

  const handleStopRolling = () => {
    if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
    rollingIntervalRef.current = null;
    setTianDiNums([
      String(Math.floor(Math.random() * 10)),
      String(Math.floor(Math.random() * 10)),
      String(Math.floor(Math.random() * 10)),
      String(Math.floor(Math.random() * 10)),
    ]);
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

  /** 起盘；从卦例夹复原时用 override 直接给值（setState 是异步的，不能读完再算） */
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

  // 从卦例夹打开：?case=<id>
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const id = new URLSearchParams(window.location.search).get('case');
    if (!id) return;
    void (async () => {
      const record = await getCaseStore().get(id);
      if (!record || record.kind !== 'xct' || record.input.kind !== 'xct') {
        setNotice('卦例不存在或类型不符');
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
      await getCaseStore().save(record);
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

    return (
      <div ref={resultRef} className="mx-auto w-full max-w-[760px] px-3 pb-24 pt-5 sm:px-5 sm:pt-7">
        <div className="flex items-center justify-between gap-3 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-[5px] w-[5px] rounded-full bg-[#8E3A2C]" />
            <span className="font-serif text-[13px] font-semibold tracking-[0.18em] text-[#22201B]">小成图 · 排盘</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/cases"
              className="hidden font-serif text-[11px] text-[#5e5a50] underline-offset-4 hover:text-[#8e3a2c] hover:underline sm:inline"
            >
              卦例夹
            </Link>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={Boolean(savedId)}
              title={savedId ? '已保存到卦例夹' : '保存起卦输入，随时重排'}
              className={`flex cursor-pointer items-center gap-1.5 rounded-[2px] border px-2.5 py-1.5 font-serif text-[11.5px] transition-colors ${
                savedId
                  ? 'cursor-default border-[#DED6C6] text-[#8c8272]'
                  : 'border-[#CBBFA8] text-[#5E5A50] hover:border-[#8A8378] hover:text-[#22201B]'
              }`}
            >
              <Star size={12} fill={savedId ? 'currentColor' : 'none'} />
              <span>{savedId ? '已保存' : '保存卦例'}</span>
            </button>
            <Link
              href="/"
              className="font-serif text-[11px] text-[#5e5a50] underline-offset-4 hover:text-[#8e3a2c] hover:underline"
            >
              首页
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className="flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-[#CBBFA8] px-2.5 py-1.5 font-serif text-[11.5px] text-[#5E5A50] transition-colors hover:border-[#8A8378] hover:text-[#22201B]"
            >
              <RotateCcw size={12} />
              <span>重新起卦</span>
            </button>
          </div>
        </div>

        {/* 起卦天时 */}
        <div className="border-y border-[#DED6C6] py-3">
          {timeDisplay && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-serif text-[11.5px] text-[#5E5A50]">
              <span className="tracking-wide text-[#22201B]">{timeDisplay.ganzhiStr}</span>
              <span className="text-[#CBBFA8]">|</span>
              <span>{timeDisplay.solarDateStr}</span>
              <span className="text-[#CBBFA8]">|</span>
              <span>{timeDisplay.lunarDateStr}</span>
              {movingYao && (
                <>
                  <span className="text-[#CBBFA8]">|</span>
                  <span>动爻 第 {movingYao} 爻</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 卦象 */}
        <div className="flex select-none items-start justify-center gap-7 pb-1 pt-5 sm:gap-10">
          <HexagramFigure hex={board.ben} label="本卦" />
          <div className="flex flex-col items-center gap-2 pt-[42px]">
            <span className="h-6 w-px bg-[#DED6C6]" />
            <span className="font-serif text-[12px] tracking-[0.1em] text-[#5E5A50]">之</span>
            <span className="h-6 w-px bg-[#DED6C6]" />
          </div>
          <HexagramFigure hex={board.zhi} label="变卦" accent />
        </div>

        {/* 结论（当前宫位四象八断） */}
        <VerdictCard judgment={judgments[activePalace]} chainPath={chainPath} chainEnd={chainEnd} />

        {/* 九宫 */}
        <div className="mt-4">
          <NinePalaceBoard judgments={judgments} activePalace={activePalace} onSelectPalace={selectPalace} />
        </div>
        <p className="mt-2 font-serif text-[11px] text-[#8c8272]">
          点击任一宫位，即以该宫为起点重算正推气路（无问句、无自动取用）。
        </p>

        {/* 折叠：正推与详录 */}
        {chain && (
          <div className="mt-5">
            <FoldSection title="正推演化" summary={chainPath}>
              <ZhengTuiPathView chain={chain} board={board} activePalace={activePalace} onSelectPalace={selectPalace} />
            </FoldSection>
            <FoldSection title="盘面详录" summary={`八宫判毕 · 中五归藏${board.heaven[5] || ''}`}>
              <ReportView
                board={board}
                selectedJudgment={judgments[activePalace]}
                chain={chain}
                divineTimeInfo={timeDisplay}
              />
            </FoldSection>
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────── 起卦表单 ─────────────────────────
  return (
    <div className="mx-auto w-full max-w-[600px] px-4 pb-24 pt-8 sm:pt-12">
      <header className="space-y-1.5 pb-1 text-center">
        <div className="flex items-center justify-center gap-3">
          <h1 className="font-serif text-[26px] font-bold leading-tight tracking-[0.2em] text-[#1E2520] sm:text-[30px]">
            小成图
          </h1>
          <Link
            href="/cases"
            className="font-serif text-[11px] text-[#5e5a50] underline-offset-4 hover:text-[#8e3a2c] hover:underline"
          >
            卦例夹
          </Link>
          <Link
            href="/"
            className="font-serif text-[11px] text-[#5e5a50] underline-offset-4 hover:text-[#8e3a2c] hover:underline"
          >
            首页
          </Link>
        </div>
        <div className="flex items-center justify-center gap-2.5 font-serif text-[11px] tracking-[0.16em] text-[#556453]">
          <span className="h-px w-8 bg-[#C8D6C6] sm:w-12" />
          <span>阖辟往来 · 四象八断 · 正推因果</span>
          <span className="h-px w-8 bg-[#C8D6C6] sm:w-12" />
        </div>
      </header>

      {notice && (
        <div className="mt-4 w-full rounded-[3px] border border-[#d9a99f] bg-[#fdf2ef] p-2.5 text-center font-serif text-[11.5px] text-[#8e3a2c]">
          {notice}
        </div>
      )}

      <div className="mt-5 w-full space-y-4 rounded-[4px] border border-[#CCD8CB] bg-[#FDFCF7] p-4 shadow-[0_1px_6px_rgba(23,20,15,0.04)] sm:p-5">
        {/* 起卦法门 */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[12px] font-bold text-[#1E2520]">起卦方式</span>
            <span className="font-serif text-[11px] text-[#7A8A78]">
              {method === 'four' ? '随口四数成卦' : method === 'time' ? '梅花时空成卦' : '直选八卦成卦'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 rounded-[4px] border border-[#CCD8CB]/80 bg-[#F0EBE1]/70 p-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`h-9 cursor-pointer rounded-[3px] font-serif text-[12px] transition-colors ${
                  method === m.id
                    ? 'bg-[#3F5B4B] font-semibold text-white shadow-sm'
                    : 'text-[#4A4237] hover:bg-[#FAF8F1]/80 hover:text-[#1E2520]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 天地数 */}
        {method === 'four' && (
          <div className="space-y-3 border-t border-[#EDF2EB] pt-3">
            <span className="block font-serif text-[11px] text-[#7A8A78]">随口报四数（0 至 9）：</span>
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
                    className={`h-12 w-full select-all rounded-[3px] border bg-white py-1.5 text-center font-serif text-lg font-bold text-[#1E2520] outline-none transition-all ${
                      isRolling
                        ? 'scale-[1.02] border-[#3F5B4B] bg-[#F4F8F3] text-[#3F5B4B]'
                        : 'border-[#CCD8CB] focus:border-[#3F5B4B]'
                    }`}
                  />
                  <span className="mt-1 block font-serif text-[10px] text-[#6B7B69] sm:text-[11px]">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center pt-1">
              {!isRolling ? (
                <button
                  type="button"
                  onClick={handleStartRolling}
                  className="cursor-pointer rounded-[4px] border border-[#CCD8CB] bg-[#F7FAF6] px-4 py-1.5 font-serif text-[12px] tracking-wider text-[#2F3E30] shadow-sm transition-all hover:bg-[#EDF2EB] hover:text-[#1E2520] active:scale-95"
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
          <div className="space-y-3 border-t border-[#EDF2EB] pt-3">
            <div className="flex items-center justify-between">
              <span className="font-serif text-[11px] text-[#7A8A78]">以天时通神，依农历年月日时推衍成卦：</span>
              <button
                type="button"
                onClick={() => setSelectedTime(nowLocalInput())}
                className="cursor-pointer font-serif text-[11px] text-[#3F5B4B] underline hover:text-[#1E2520]"
              >
                取当前系统时刻
              </button>
            </div>
            <input
              type="datetime-local"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              aria-label="起卦时间"
              className="h-11 w-full rounded-[3px] border border-[#CCD8CB] bg-white px-3 font-serif text-[13px] text-[#1E2520] outline-none focus:border-[#3F5B4B]"
            />
            {timePreview && (
              <div className="space-y-2 rounded-[3px] border border-[#CCD8CB] bg-[#FAFBF9] p-3 font-serif text-[11.5px]">
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#E8EFE4] pb-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[#7A8A78]">
                      公历：<span className="font-sans font-medium text-[#1E2520]">{timePreview.solarDateStr}</span>
                    </span>
                    <span className="hidden text-[#CCD8CB] sm:inline">|</span>
                    <span className="font-bold text-[#1E2520]">干支：{timePreview.ganzhiStr}</span>
                  </div>
                  <span className="text-[10.5px] text-[#6B7B69]">{timePreview.lunarStr}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
                  <div className="rounded border border-[#E8EFE4] bg-white p-1.5">
                    <span className="block text-[10px] text-[#7A8A78]">上卦（年+月+日）</span>
                    <span className="mt-0.5 block text-[13px] font-bold text-[#3F5B4B]">
                      余 {timePreview.upperRem} · {XIAN_TIAN_NUMBER[timePreview.upperRem]}卦
                    </span>
                  </div>
                  <div className="rounded border border-[#E8EFE4] bg-white p-1.5">
                    <span className="block text-[10px] text-[#7A8A78]">下卦（加时辰支）</span>
                    <span className="mt-0.5 block text-[13px] font-bold text-[#3F5B4B]">
                      余 {timePreview.lowerRem} · {XIAN_TIAN_NUMBER[timePreview.lowerRem]}卦
                    </span>
                  </div>
                  <div className="rounded border border-[#E8EFE4] bg-white p-1.5">
                    <span className="block text-[10px] text-[#7A8A78]">动爻（总和÷6）</span>
                    <span className="mt-0.5 block text-[13px] font-bold text-[#9c7a3c]">
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
          <div className="space-y-2 border-t border-[#EDF2EB] pt-3">
            <span className="block font-serif text-[11px] text-[#7A8A78]">直选本卦之卦上下卦：</span>
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
                  <label htmlFor={id} className="mb-0.5 block text-[#7A8A78]">
                    {label}
                  </label>
                  <select
                    id={id}
                    value={value}
                    onChange={(e) => (setter as (t: Trigram) => void)(e.target.value as Trigram)}
                    className="w-full rounded border border-[#CCD8CB] bg-white p-1.5 text-[12px]"
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

        <div className="flex justify-center border-t border-[#EDF2EB] pt-3">
          <button
            type="button"
            disabled={isRolling}
            onClick={() => runCast()}
            className="flex h-11 w-full max-w-[220px] select-none cursor-pointer items-center justify-center bg-[#334a5d] px-6 font-serif text-[14px] tracking-[0.2em] text-[#fbf7ec] shadow-sm transition-all hover:bg-[#283a49] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
          >
            {isRolling ? '数字翻滚中…' : '排 盘 →'}
          </button>
        </div>
      </div>
    </div>
  );
}

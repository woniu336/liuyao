'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { RotateCcw, Star } from 'lucide-react';
import CastWorkbench from './CastWorkbench';
import ManualCast from './ManualCast';
import HexagramBoard from './HexagramBoard';
import type { CoinResult } from './types';
import { castLiuyao, type LiuyaoChart } from '@/lib/liuyao/najia';
import { buildLiuyaoInput, castTimeInfo, nowTimeInput, parseTimeInput, type CastTimeInfo } from '@/lib/liuyao/ganzhi';
import { boardToText, chartToBoardProps, type BoardViewProps } from '@/lib/liuyao/board-view';
import { getCaseStore } from '@/lib/store';
import { buildLiuyaoRecord } from '@/lib/cases/record';

type CastMode = 'coin' | 'yarrow' | 'manual';

const MODES: { id: CastMode; label: string; hint: string }[] = [
  { id: 'coin', label: '三钱摇卦', hint: '六次掷币，每次三枚' },
  { id: 'yarrow', label: '大衍筮法', hint: '五十蓍草，十八变' },
  { id: 'manual', label: '手工录入', hint: '已知卦象，逐爻录入' },
];

const emptyManual = (): (CoinResult | null)[] => [null, null, null, null, null, null];

/**
 * 六爻页：起卦 → 确定性排盘 → 古法卦单。
 *
 * 盘面版式与 bazi-web 六爻结果页一致（同一套定宽栅格与字号），
 * 问句与性别只作落款记录，**不参与任何计算**：本仓库不搬用神推断与五层 DAG。
 */
export default function LiuyaoView() {
  const [question, setQuestion] = useState('');
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [method, setMethod] = useState<CastMode>('coin');
  const [timeInput, setTimeInput] = useState<string>(() => nowTimeInput());
  const [autoTime, setAutoTime] = useState(true);
  const [manual, setManual] = useState<(CoinResult | null)[]>(emptyManual);
  const [castKey, setCastKey] = useState(0);
  const [result, setResult] = useState<{
    chart: LiuyaoChart;
    time: CastTimeInfo;
    coins: number[];
    method: CastMode;
    timeInput: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const restoredRef = useRef(false);

  const timeInfo = useMemo(() => {
    try {
      return castTimeInfo(parseTimeInput(timeInput));
    } catch {
      return null;
    }
  }, [timeInput]);

  const applyCast = React.useCallback((values: number[], when: string, castMethod: CastMode) => {
    try {
      const info = castTimeInfo(parseTimeInput(when));
      const chart = castLiuyao(buildLiuyaoInput(info, values));
      setResult({ chart, time: info, coins: values, method: castMethod, timeInput: when });
      setSavedId(null);
      setError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const handleComplete = React.useCallback(
    (values: CoinResult[]) => {
      // 自动时间模式下，以提交这一刻起卦（与盘面显示的干支一致）
      const now = autoTime ? nowTimeInput() : timeInput;
      if (autoTime) setTimeInput(now);
      applyCast(values, now, method);
    },
    [autoTime, timeInput, method, applyCast],
  );

  // 从卦例夹打开：?case=<id> —— 用记录里的输入重排同一卦
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const id = new URLSearchParams(window.location.search).get('case');
    if (!id) return;
    void (async () => {
      const record = await getCaseStore().get(id);
      if (!record || record.kind !== 'liuyao' || record.input.kind !== 'liuyao') {
        setError('卦例不存在或类型不符');
        return;
      }
      setQuestion(record.input.question ?? '');
      setGender(record.input.gender ?? '男');
      setMethod(record.input.method);
      setTimeInput(record.timeInput);
      setAutoTime(false);
      applyCast(record.input.coins, record.timeInput, record.input.method);
    })();
  }, [applyCast]);

  const handleReset = () => {
    setResult(null);
    setManual(emptyManual());
    setCastKey((k) => k + 1);
    setError('');
    setQuestion('');
    setAutoTime(true);
    setTimeInput(nowTimeInput());
    setSavedId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const record = buildLiuyaoRecord({
        chart: result.chart,
        time: result.time,
        timeInput: result.timeInput,
        question,
        gender,
        method: result.method,
        coins: result.coins,
      });
      await getCaseStore().save(record);
      setSavedId(record.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const boardProps: BoardViewProps | null = result
    ? chartToBoardProps(result.chart, result.time, question, gender)
    : null;

  const handleCopy = async () => {
    if (!boardProps) return;
    try {
      await navigator.clipboard.writeText(boardToText(boardProps));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 隐私模式或未授权：静默 */
    }
  };

  const manualComplete = manual.every((v): v is CoinResult => v !== null);

  // ───────────────────────── 盘面（原项目结果页版式） ─────────────────────────
  if (boardProps) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-start bg-[#F7F3EA] px-3 py-6 font-serif text-[#17140F] sm:px-6 sm:py-12">
        {/* 顶部极简快捷操作栏 */}
        <div className="mb-4 flex w-full max-w-3xl items-center justify-between px-2 text-xs text-[#7A6F62] sm:mb-6">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#9E2A2B]/70" />
            <span className="text-sm font-bold tracking-widest text-[#4A4238]">古筮排盘</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/cases"
              className="hidden text-[11.5px] text-[#7A6F62] underline-offset-4 hover:text-[#9E2A2B] hover:underline sm:inline"
            >
              卦例夹
            </Link>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={Boolean(savedId)}
              title={savedId ? '已保存到卦例夹' : '保存起卦输入，随时重排'}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 shadow-xs transition-all active:scale-95 disabled:cursor-default ${
                savedId
                  ? 'border-[#DCD6C5] bg-[#F3F0E4] text-[#8C7E6D]'
                  : 'border-[#DCD6C5] bg-[#F3F0E4] text-[#4A4238] hover:bg-[#EAE5D4]'
              }`}
            >
              <Star size={13} fill={savedId ? 'currentColor' : 'none'} />
              <span>{savedId ? '已保存' : '保存卦例'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#DCD6C5] bg-[#F3F0E4] px-3 py-1.5 text-[#4A4238] shadow-xs transition-all hover:bg-[#EAE5D4] active:scale-95"
            >
              {copied ? '已复制' : '复制盘面'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#9E2A2B]/30 bg-[#9E2A2B]/10 px-3 py-1.5 font-medium text-[#9E2A2B] shadow-xs transition-all hover:bg-[#9E2A2B]/15 active:scale-95"
            >
              <RotateCcw size={13} />
              <span>重起一卦</span>
            </button>
          </div>
        </div>

        {/* 宣纸画卷卡片 */}
        <div
          ref={paperRef}
          className="relative w-full max-w-3xl space-y-7 rounded-md border border-[#E0D8C9] bg-[#FFFDF8] p-5 shadow-[0_2px_12px_rgba(23,20,15,0.05)] transition-all sm:p-9"
        >
          {/* 上卷：古法卦单 */}
          <section className="w-full">
            <HexagramBoard {...boardProps} />
          </section>

          {/* 下卷：裁剪说明（原项目此处为解卦手札，本仓库不含大模型解卦） */}
          <section className="space-y-3 border-t border-[#E8DFC9] pt-4">
            <div className="flex items-center gap-2 text-xs font-bold tracking-[0.25em] text-[#6E6355]">
              <span className="inline-block h-[5px] w-[5px] rounded-full bg-[#9E2A2B]/70" />
              <span>收 盘 说 明</span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-[#7D7060]">
              本页只做确定性排盘：纳甲装卦 · 安世应 · 定六亲 · 旬空 · 伏神 · 六神 · 月卦身 · 十三神煞。
              不含用神取舍、生克旺衰、吉凶断语与应期，也不调用大模型解卦。
            </p>
            <p className="text-[12px] leading-relaxed text-[#9C907F]">
              所问与性别只作落款记录，未参与任何计算。
            </p>
          </section>
        </div>

        {/* 底部极简知照 */}
        <div className="mt-4 w-full max-w-3xl text-center text-[11px] text-[#9C907F]">
          <span>易象昭然，以卦观事；谋事在人，成事在天。关键决策请结合客观现实明察审断。</span>
        </div>

        {error && (
          <div className="mt-3 w-full max-w-3xl rounded-[3px] border border-[#d9a99f] bg-[#fdf2ef] px-3 py-2 text-center text-[11.5px] text-[#8e3a2c]">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────── 起卦表单 ─────────────────────────
  return (
    <div className="mx-auto w-full max-w-[860px] px-3 pb-24 pt-6 sm:px-5 sm:pt-9">
      <header className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <span className="inline-block h-[5px] w-[5px] rounded-full bg-[#8E3A2C]" />
            <h1 className="font-serif text-[19px] font-semibold tracking-[0.16em] text-[#22201b] sm:text-[21px]">
              六爻排盘
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3 font-serif text-[11.5px] text-[#5e5a50]">
            <Link href="/cases" className="underline-offset-4 transition-colors hover:text-[#8e3a2c] hover:underline">
              卦例夹
            </Link>
            <Link href="/" className="underline-offset-4 transition-colors hover:text-[#8e3a2c] hover:underline">
              返回首页
            </Link>
          </div>
        </div>
        <p className="mt-1.5 pl-[18px] font-serif text-[11.5px] tracking-[0.04em] text-[#7c7365]">
          纳甲装卦 · 安世应 · 定六亲 · 旬空 · 伏神 · 天医文昌神煞（纯确定性排盘，不含吉凶断语）
        </p>
      </header>

      <div className="space-y-4 rounded-md border border-[#E0D8C9] bg-[#FFFDF8] p-4 shadow-[0_1px_6px_rgba(23,20,15,0.04)] sm:p-5">
        {/* 问句 + 性别（仅记录） */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label htmlFor="question" className="block font-serif text-[12px] font-semibold text-[#22201b]">
              所问何事
              <span className="ml-1.5 font-normal text-[#8c8272]">选填 · 仅作落款，不参与排盘</span>
            </label>
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-[11px] text-[#8c8272]">性别</span>
              <div className="flex overflow-hidden rounded-[3px] border border-[#D9CDB6]">
                {(['男', '女'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`h-7 w-9 cursor-pointer font-serif text-[11.5px] transition-colors ${
                      gender === g ? 'bg-[#8e3a2c] text-[#fffdf8]' : 'bg-white text-[#5e5a50] hover:bg-[#faf7f0]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <input
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="可留空；此处文字只会原样写在盘面落款处"
            className="h-11 w-full rounded-[3px] border border-[#D9CDB6] bg-white px-3 font-serif text-[14px] text-[#22201b] outline-none transition-colors focus:border-[#8e3a2c]"
          />
        </div>

        {/* 起卦时间 */}
        <div className="space-y-1.5 border-t border-[#EFE7D8] pt-3">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="cast-time" className="font-serif text-[12px] font-semibold text-[#22201b]">
              起卦时间
            </label>
            <button
              type="button"
              onClick={() => {
                setAutoTime(true);
                setTimeInput(nowTimeInput());
              }}
              className="cursor-pointer font-serif text-[11px] text-[#8e3a2c] underline underline-offset-4"
            >
              取当前时刻
            </button>
          </div>
          <input
            id="cast-time"
            type="datetime-local"
            value={timeInput}
            onChange={(e) => {
              setAutoTime(false);
              setTimeInput(e.target.value);
            }}
            className="h-10 w-full max-w-[260px] rounded-[3px] border border-[#D9CDB6] bg-white px-2.5 font-serif text-[13px] text-[#22201b] outline-none focus:border-[#8e3a2c]"
          />
          {timeInfo && (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 font-serif text-[11px] text-[#6c6354]">
              <span className="text-[#22201b]">{timeInfo.ganzhiText}</span>
              <span className="text-[#cbbfa8]">|</span>
              <span>{timeInfo.lunarText}</span>
              <span className="text-[#cbbfa8]">|</span>
              <span>月建 {timeInfo.monthBranch} · 日空按日柱起旬</span>
            </div>
          )}
        </div>

        {/* 法门 */}
        <div className="space-y-2 border-t border-[#EFE7D8] pt-3">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[12px] font-semibold text-[#22201b]">起卦法门</span>
            <span className="font-serif text-[11px] text-[#8c8272]">{MODES.find((m) => m.id === method)?.hint}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 rounded-[4px] border border-[#E0D8C9]/80 bg-[#F0EBE1]/70 p-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`h-9 cursor-pointer rounded-[3px] font-serif text-[12px] transition-colors ${
                  method === m.id
                    ? 'bg-[#3F5B4B] font-semibold text-white shadow-sm'
                    : 'text-[#4a4237] hover:bg-[#faf8f1]/80 hover:text-[#22201b]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="pt-1">
            {(method === 'coin' || method === 'yarrow') && (
              <CastWorkbench key={`${method}-${castKey}`} method={method} onComplete={handleComplete} />
            )}
            {method === 'manual' && (
              <div className="space-y-3">
                <ManualCast
                  values={manual}
                  onChange={(idx, value) => {
                    setManual((prev) => {
                      const next = [...prev];
                      next[idx] = value;
                      return next;
                    });
                  }}
                />
                <div className="flex justify-center">
                  <button
                    type="button"
                    disabled={!manualComplete}
                    onClick={() => handleComplete(manual as CoinResult[])}
                    className="btn primary sm w-full max-w-[220px] font-serif tracking-widest disabled:cursor-not-allowed"
                  >
                    六爻已备 · 排盘 →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-[3px] border border-[#d9a99f] bg-[#fdf2ef] px-3 py-2 font-serif text-[11.5px] text-[#8e3a2c]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

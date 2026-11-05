'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import CastWorkbench from './CastWorkbench';
import ManualCast from './ManualCast';
import ChartBoard from './ChartBoard';
import type { CoinResult } from './types';
import { castLiuyao, type LiuyaoChart } from '@/lib/liuyao/najia';
import { buildLiuyaoInput, castTimeInfo, nowTimeInput, parseTimeInput, type CastTimeInfo } from '@/lib/liuyao/ganzhi';

type CastMode = 'coin' | 'yarrow' | 'manual';

const MODES: { id: CastMode; label: string; hint: string }[] = [
  { id: 'coin', label: '三钱摇卦', hint: '六次掷币，每次三枚' },
  { id: 'yarrow', label: '大衍筮法', hint: '五十蓍草，十八变' },
  { id: 'manual', label: '手工录入', hint: '已知卦象，逐爻录入' },
];

const emptyManual = (): (CoinResult | null)[] => [null, null, null, null, null, null];

/**
 * 六爻页：起卦 → 确定性排盘 → 盘面。
 *
 * 问句输入只做记录（写在盘面顶部，可复制），**不参与任何计算**：
 * 本仓库不搬用神推断、不搬五层 DAG，因此也没有任何「问句 → 六亲/事类」的映射。
 */
export default function LiuyaoView() {
  const [question, setQuestion] = useState('');
  const [method, setMethod] = useState<CastMode>('coin');
  const [timeInput, setTimeInput] = useState<string>(() => nowTimeInput());
  const [autoTime, setAutoTime] = useState(true);
  const [manual, setManual] = useState<(CoinResult | null)[]>(emptyManual);
  const [castKey, setCastKey] = useState(0);
  const [chart, setChart] = useState<LiuyaoChart | null>(null);
  const [resultTime, setResultTime] = useState<CastTimeInfo | null>(null);
  const [error, setError] = useState('');
  const resultRef = useRef<HTMLDivElement | null>(null);

  const timeInfo = useMemo(() => {
    try {
      return castTimeInfo(parseTimeInput(timeInput));
    } catch {
      return null;
    }
  }, [timeInput]);

  const runCast = useCallback(
    (values: number[]) => {
      try {
        const info = castTimeInfo(parseTimeInput(timeInput));
        const nextChart = castLiuyao(buildLiuyaoInput(info, values));
        setChart(nextChart);
        setResultTime(info);
        setError('');
        requestAnimationFrame(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } catch (e) {
        setChart(null);
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [timeInput],
  );

  const handleComplete = useCallback(
    (values: CoinResult[]) => {
      if (autoTime) setTimeInput(nowTimeInput());
      // 用提交那一刻的时间排盘：autoTime 下与盘面显示保持一致
      const info = castTimeInfo(parseTimeInput(autoTime ? nowTimeInput() : timeInput));
      try {
        const nextChart = castLiuyao(buildLiuyaoInput(info, values));
        setChart(nextChart);
        setResultTime(info);
        setError('');
        requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      } catch (e) {
        setChart(null);
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [autoTime, timeInput],
  );

  const handleReset = () => {
    setChart(null);
    setResultTime(null);
    setManual(emptyManual());
    setCastKey((k) => k + 1);
    setError('');
    setQuestion('');
    setAutoTime(true);
    setTimeInput(nowTimeInput());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const manualComplete = manual.every((v): v is CoinResult => v !== null);

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
          <Link
            href="/"
            className="shrink-0 font-serif text-[11.5px] text-[#5e5a50] underline-offset-4 transition-colors hover:text-[#8e3a2c] hover:underline"
          >
            返回首页
          </Link>
        </div>
        <p className="mt-1.5 pl-[18px] font-serif text-[11.5px] tracking-[0.04em] text-[#7c7365]">
          纳甲装卦 · 安世应 · 定六亲 · 旬空 · 伏神 · 天医文昌神煞（纯确定性排盘，不含吉凶断语）
        </p>
      </header>

      {!chart && (
        <div className="space-y-4 rounded-md border border-[#E0D8C9] bg-[#FFFDF8] p-4 shadow-[0_1px_6px_rgba(23,20,15,0.04)] sm:p-5">
          {/* 问句（仅记录） */}
          <div className="space-y-1.5">
            <label htmlFor="question" className="block font-serif text-[12px] font-semibold text-[#22201b]">
              所问何事
              <span className="ml-1.5 font-normal text-[#8c8272]">选填 · 仅作记录，不参与排盘</span>
            </label>
            <input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="可留空；此处文字只会原样写在盘面顶部"
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
                <span>月建 {timeInfo.monthBranch} 日空按日柱起旬</span>
              </div>
            )}
          </div>

          {/* 法门 */}
          <div className="space-y-2 border-t border-[#EFE7D8] pt-3">
            <div className="flex items-center justify-between">
              <span className="font-serif text-[12px] font-semibold text-[#22201b]">起卦法门</span>
              <span className="font-serif text-[11px] text-[#8c8272]">
                {MODES.find((m) => m.id === method)?.hint}
              </span>
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
                <CastWorkbench
                  key={`${method}-${castKey}`}
                  method={method}
                  onComplete={handleComplete}
                />
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
      )}

      {chart && resultTime && (
        <div ref={resultRef} className="space-y-4">
          <ChartBoard chart={chart} time={resultTime} question={question} />
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-[#CBBFA8] px-3 py-2 font-serif text-[12px] text-[#5e5a50] transition-colors hover:border-[#8a8378] hover:text-[#22201b]"
            >
              <RotateCcw size={12} />
              重新起卦
            </button>
          </div>
          {error && (
            <div className="rounded-[3px] border border-[#d9a99f] bg-[#fdf2ef] px-3 py-2 text-center font-serif text-[11.5px] text-[#8e3a2c]">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

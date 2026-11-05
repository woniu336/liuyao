'use client';

/**
 * 首页 · 起卦页
 * ==============
 * 版式对齐原项目 /qigua：**问事输入 + 性别 + 时间 全部明面可见**，
 * 下面是原版三钱起卦台（CastWorkbench：大铜钱、进度、逐爻判决、一键起卦、卦象预览）。
 *
 * 我们只加两件事：
 *   1. 卦成后弹窗选「六爻 / 小成图」，同一卦两看；
 *   2. 「手动指定」入口（本卦/变卦，动爻自动推）。
 *
 * 随机源：CastWorkbench → lib/liuyao/random.ts（Web Crypto），无 Math.random。
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CastWorkbench from '@/components/liuyao/CastWorkbench';
import GuaPicker, { movingBetween } from './GuaPicker';
import { Button } from '@/components/ui';
import { encodeCastState } from '@/lib/liuyao/cast-url';
import { castTimeInfo, nowTimeInput, parseTimeInput } from '@/lib/liuyao/ganzhi';
import type { CoinResult } from '@/components/liuyao/types';
import { SIXTY_FOUR_HEXAGRAMS } from '@/lib/liuyao/najia';

const POS_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

export default function CastPage() {
  const router = useRouter();

  const [question, setQuestion] = useState('');
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [marital, setMarital] = useState<'unmarried' | 'married'>('unmarried');
  const [timeInput, setTimeInput] = useState('');
  const [autoTime, setAutoTime] = useState(true);

  const [values, setValues] = useState<CoinResult[] | null>(null);
  const [sheet, setSheet] = useState<'none' | 'manual'>('none');
  const [castKey, setCastKey] = useState(0);

  const [benBinary, setBenBinary] = useState('111111');
  const [zhiBinary, setZhiBinary] = useState('111111');

  useEffect(() => {
    setTimeInput(nowTimeInput());
  }, []);

  const timeInfo = useMemo(() => {
    if (!timeInput) return null;
    try {
      return castTimeInfo(parseTimeInput(autoTime ? nowTimeInput() : timeInput));
    } catch {
      return null;
    }
  }, [timeInput, autoTime]);

  const moving = useMemo(
    () => (values ? values.flatMap((v, i) => (v === 6 || v === 9 ? [i + 1] : [])) : []),
    [values],
  );
  const baseName = values
    ? SIXTY_FOUR_HEXAGRAMS[values.map((v) => (v === 7 || v === 9 ? '1' : '0')).join('')]?.name
    : null;

  const handleComplete = useCallback(
    (next: CoinResult[]) => {
      if (autoTime) setTimeInput(nowTimeInput());
      setValues(next);
    },
    [autoTime],
  );

  const manualMoving = movingBetween(benBinary, zhiBinary);
  const manualStatic = manualMoving.length === 0;

  const manualComplete = () => {
    const bits = benBinary.split('');
    const next: CoinResult[] = bits.map((b, i) => {
      const isMoving = manualMoving.includes(i + 1);
      const yang = b === '1';
      if (!isMoving) return (yang ? 7 : 8) as CoinResult;
      return (yang ? 9 : 6) as CoinResult;
    });
    if (autoTime) setTimeInput(nowTimeInput());
    setValues(next);
    setSheet('none');
  };

  const go = (target: 'liuyao' | 'xct') => {
    if (!values) return;
    const qs = encodeCastState({
      coins: values,
      timeInput: autoTime ? nowTimeInput() : timeInput,
      gender,
      marital,
      question,
    });
    router.push(`/${target}?${qs}`);
  };

  const reset = () => {
    setValues(null);
    setCastKey((k) => k + 1);
    setAutoTime(true);
    setTimeInput(nowTimeInput());
  };

  return (
    <div className="min-h-screen bg-paper-1 pb-16">
      {/* 顶部 */}
      <header className="safe-top">
        <div className="mx-auto flex h-[54px] w-full max-w-[860px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-baseline gap-2">
            <span className="font-song text-[18px] font-semibold tracking-[0.16em] text-ink-900">六爻</span>
            <span className="text-[10.5px] tracking-[0.08em] text-ink-500">三钱摇卦 · 一事一占</span>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-ink-500">
            <Link href="/cases" className="press underline-offset-4 hover:text-ink-900">
              卦例夹
            </Link>
            <Link href="/design" className="press hidden underline-offset-4 hover:text-ink-900 sm:inline">
              设计
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[860px] px-4 pt-2 sm:px-6">
        {/* 标题 */}
        <div className="pb-4 pt-2 text-center">
          <h1 className="font-song text-[26px] font-bold leading-tight tracking-[0.22em] text-ink-900 sm:text-[30px]">
            起 卦
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2.5 text-[10.5px] tracking-[0.16em] text-ink-500">
            <span className="h-px w-8 bg-line-strong sm:w-12" />
            <span>心念纯一 · 六掷成卦 · 卦成可两看</span>
            <span className="h-px w-8 bg-line-strong sm:w-12" />
          </div>
        </div>

        {/* 求测信息（明面可见，不折叠） */}
        <div className="rounded-md border border-line bg-paper-0 p-4 shadow-[0_1px_2px_rgba(31,42,48,0.05)] sm:p-5">
          <label htmlFor="q" className="block text-[12px] font-semibold text-ink-800">
            求测事项
          </label>
          <input
            id="q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={120}
            placeholder="所问何事（如：这个项目月底前能否落地）"
            className="mt-1.5 h-11 w-full rounded-xs border border-line-strong bg-paper-1 px-3 font-song text-[15px] text-ink-900 outline-none transition-colors focus:border-mist-600 focus:bg-paper-0"
          />

          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* 性别 */}
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-ink-500">性别</span>
              <div className="flex overflow-hidden rounded-xs border border-line-strong">
                {(['男', '女'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`press h-8 w-11 text-[13px] transition-colors ${
                      gender === g ? 'bg-mist-700 font-medium text-paper-0' : 'bg-paper-0 text-ink-600'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* 婚否（只影响小成图用宫） */}
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-ink-500">婚否</span>
              <div className="flex overflow-hidden rounded-xs border border-line-strong">
                {(['未婚', '已婚'] as const).map((label, i) => {
                  const v = i === 0 ? 'unmarried' : 'married';
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMarital(v as 'married' | 'unmarried')}
                      className={`press h-8 w-12 text-[12.5px] transition-colors ${
                        marital === v ? 'bg-mist-700 font-medium text-paper-0' : 'bg-paper-0 text-ink-600'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <span className="hidden text-[10.5px] text-ink-400 sm:inline">（小成图取用宫用）</span>
            </div>
          </div>

          {/* 时间 */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3">
            <span className="text-[11.5px] text-ink-500">起卦时间</span>
            <input
              type="datetime-local"
              value={timeInput}
              onChange={(e) => {
                setAutoTime(false);
                setTimeInput(e.target.value);
              }}
              className="h-8 rounded-xs border border-line-strong bg-paper-0 px-2 text-[12.5px] tabular-nums text-ink-800 outline-none focus:border-mist-600"
            />
            <button
              type="button"
              onClick={() => {
                setAutoTime(true);
                setTimeInput(nowTimeInput());
              }}
              className={`press text-[11.5px] underline-offset-4 hover:underline ${
                autoTime ? 'text-mist-700' : 'text-ink-500'
              }`}
            >
              {autoTime ? '跟随当前时刻' : '归位当前'}
            </button>
            {timeInfo && (
              <span className="text-[11px] tabular-nums text-ink-500">
                {timeInfo.ganzhiText} · 旬空按日柱
              </span>
            )}
          </div>
        </div>

        {/* 起卦台（原版三钱摇卦：大铜钱 + 进度 + 逐爻判决 + 卦象预览） */}
        <div className="mt-4" key={castKey}>
          <CastWorkbench onComplete={handleComplete} />
        </div>

        {/* 手动指定 */}
        <div className="mt-3 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setSheet('manual')}
            className="press rounded-xs border border-line-strong px-4 py-2 text-[12.5px] text-ink-600 transition-colors hover:border-mist-500 hover:text-ink-900"
          >
            手动指定卦象（本卦 / 变卦）
          </button>
        </div>

        <p className="mt-4 text-center text-[10.5px] leading-relaxed text-ink-400">
          随机数取自浏览器 Web Crypto（逐位取用、无模偏差）；一事一占，卦成后可在顶部互相切换六爻与小成图。
        </p>
      </main>

      {/* 手动指定 */}
      {sheet === 'manual' && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/30 backdrop-blur-[2px]"
          onClick={() => setSheet('none')}
        >
          <div
            className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-t-lg bg-paper-0 px-5 pb-6 pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-song text-[15px] font-semibold tracking-[0.08em] text-ink-900">手动指定</h3>
              <button type="button" onClick={() => setSheet('none')} className="press text-[12px] text-ink-500">
                关闭
              </button>
            </div>

            <GuaPicker label="本卦" value={benBinary} onChange={setBenBinary} />
            <div className="mt-4">
              <GuaPicker label="变卦（与本卦相同即静卦）" value={zhiBinary} onChange={setZhiBinary} />
            </div>

            <div className="mt-4 flex items-center justify-between text-[12px] text-ink-600">
              <span>
                本卦 {SIXTY_FOUR_HEXAGRAMS[benBinary]?.name}　之　{SIXTY_FOUR_HEXAGRAMS[zhiBinary]?.name}
              </span>
              <span className={manualStatic ? 'text-mist-700' : 'text-cinnabar-600'}>
                {manualStatic ? '静卦' : `动爻：${manualMoving.map((p) => POS_NAMES[p - 1]).join('、')}`}
              </span>
            </div>

            <div className="mt-4">
              <Button size="lg" block onClick={manualComplete}>
                以此卦起局
              </Button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
              动爻由两卦逐爻比对自动得出；静卦将用宜变法（55 − 营数之和）取宜变之爻立之卦。
            </p>
          </div>
        </div>
      )}

      {/* 卦成：选入口 */}
      {values && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/30 backdrop-blur-[2px]"
          onClick={() => setSheet('none')}
        >
          <div
            className="w-full max-w-[560px] rounded-t-lg bg-paper-0 px-5 pb-6 pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-song text-[17px] font-semibold tracking-[0.08em] text-ink-900">
                  {baseName ?? '六爻已齐'}
                </h3>
                <p className="mt-1">
                  {moving.length ? (
                    <span className="inline-flex items-center gap-1 text-[11.5px] text-cinnabar-600">
                      <span aria-hidden>▸</span>
                      动爻 {moving.map((p) => POS_NAMES[p - 1]).join('、')}
                    </span>
                  ) : (
                    <span className="text-[11.5px] text-mist-700">六爻安静 · 静卦</span>
                  )}
                </p>
              </div>
              <button type="button" onClick={reset} className="press shrink-0 text-[11.5px] text-ink-500 underline-offset-4 hover:underline">
                重新起卦
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="ink" size="lg" onClick={() => go('liuyao')}>
                六爻解卦
                <span className="rounded-[2px] bg-paper-0/20 px-1 text-[9.5px] font-normal">推荐</span>
              </Button>
              <Button variant="line" size="lg" onClick={() => go('xct')}>
                小成图解盘
              </Button>
            </div>
            <p className="mt-2 text-center text-[10.5px] leading-relaxed text-ink-400">
              六爻看纳甲世应，小成图看九宫四象 · 进任一侧后可在顶部一键互换
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

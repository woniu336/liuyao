'use client';

/**
 * 首页 · 起卦页（S1）
 * ===================
 * 一屏一动作：铜钱 + 进度 + 一个主按钮。
 * 「手动指定」是次级入口（底部抽屉），「补充」收在折叠里，首屏只有一件事可做。
 *
 * 随机源：每次投掷都走 lib/liuyao/random.ts（Web Crypto），不出现 Math.random。
 * 卦成后弹窗选择「六爻 / 小成图」，同一个 cast 可两看。
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Coin, type CoinSide } from '@/components/liuyao/Coin';
import GuaPicker, { binaryOf, movingBetween } from './GuaPicker';
import { Button, Panel, ProgressDots, Tag } from '@/components/ui';
import { tossLine, tossStats } from '@/lib/liuyao/random';
import { coinSidesOf, encodeCastState } from '@/lib/liuyao/cast-url';
import { castTimeInfo, nowTimeInput, parseTimeInput } from '@/lib/liuyao/ganzhi';
import type { CoinResult } from '@/components/liuyao/types';
import { SIXTY_FOUR_HEXAGRAMS, trigramsOfBinary } from '@/lib/liuyao/najia';

type Sheet = 'none' | 'manual' | 'choose';

const POS_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

export default function CastPage() {
  const router = useRouter();

  const [values, setValues] = useState<CoinResult[]>([]);
  const [coins, setCoins] = useState<CoinSide[]>(['字', '背', '字']);
  const [rolling, setRolling] = useState(false);
  const [tossSeq, setTossSeq] = useState(0);
  const [lastSum, setLastSum] = useState<CoinResult | null>(null);

  const [timeInput, setTimeInput] = useState<string>('');
  const [autoTime, setAutoTime] = useState(true);
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [marital, setMarital] = useState<'unmarried' | 'married'>('unmarried');
  const [question, setQuestion] = useState('');

  const [sheet, setSheet] = useState<Sheet>('none');
  const [benBinary, setBenBinary] = useState('111111');
  const [zhiBinary, setZhiBinary] = useState('111111');
  const [stats, setStats] = useState<ReturnType<typeof tossStats> | null>(null);

  useEffect(() => {
    // 起卦时间与随机自证都只在客户端确定，避免 SSR/CSR 渲染出不同文本
    setTimeInput(nowTimeInput());
    setStats(tossStats(2000));
  }, []);

  const complete = values.length === 6;
  const moving = useMemo(() => (complete ? values.flatMap((v, i) => (v === 6 || v === 9 ? [i + 1] : [])) : []), [values, complete]);

  const timeInfo = useMemo(() => {
    if (!timeInput) return null;
    try {
      return castTimeInfo(parseTimeInput(autoTime ? nowTimeInput() : timeInput));
    } catch {
      return null;
    }
  }, [timeInput, autoTime]);

  const doToss = useCallback(() => {
    if (rolling || complete) return;
    const sum = tossLine();
    setRolling(true);
    setTossSeq((n) => n + 1);
    window.setTimeout(() => {
      setCoins(coinSidesOf(sum) as CoinSide[]);
      setLastSum(sum as CoinResult);
      setValues((prev) => [...prev, sum as CoinResult]);
      setRolling(false);
      if (autoTime) setTimeInput(nowTimeInput());
      if (values.length + 1 === 6) setSheet('choose');
    }, 900);
  }, [rolling, complete, autoTime, values.length]);

  const reset = () => {
    setValues([]);
    setLastSum(null);
    setCoins(['字', '背', '字']);
    setSheet('none');
    setAutoTime(true);
    setTimeInput(nowTimeInput());
  };

  const manualMoving = movingBetween(benBinary, zhiBinary);
  const manualStatic = manualMoving.length === 0;

  const manualComplete = () => {
    // 本卦 = 变卦即静卦：六爻全静（7/8），之卦交由小成图的宜变法处理
    const bits = benBinary.split('');
    const next: CoinResult[] = bits.map((b, i) => {
      const isMoving = manualMoving.includes(i + 1);
      const yang = b === '1';
      if (!isMoving) return (yang ? 7 : 8) as CoinResult;
      return (yang ? 9 : 6) as CoinResult;
    });
    setValues(next);
    setSheet('choose');
  };

  const go = (target: 'liuyao' | 'xct') => {
    const qs = encodeCastState({
      coins: values,
      timeInput: autoTime ? nowTimeInput() : timeInput,
      gender,
      marital,
      question,
    });
    router.push(`/${target}?${qs}`);
  };

  const last = lastSum ? (lastSum === 6 ? '老阴 · 动' : lastSum === 9 ? '老阳 · 动' : lastSum === 7 ? '少阳' : '少阴') : '';

  return (
    <div className="min-h-screen bg-paper-1 pb-16">
      <header className="safe-top">
        <div className="mx-auto flex h-[52px] w-full max-w-[520px] items-center justify-between px-5 lg:max-w-[1080px] lg:px-8">
          <div>
            <div className="font-song text-[17px] font-semibold tracking-[0.12em] text-ink-900">六爻</div>
            <div className="text-[10.5px] tracking-[0.06em] text-ink-500">三钱摇卦 · 一事一占</div>
          </div>
          <div className="flex items-center gap-4 text-[11.5px] text-ink-500">
            <Link href="/cases" className="press underline-offset-4 hover:text-ink-900">
              卦例
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[520px] px-5 lg:max-w-[1080px] lg:px-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:items-start lg:gap-12">
          {/* 起卦 */}
          <div className="min-w-0">
            <div className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="font-song text-[15px] font-semibold text-ink-900">三钱摇卦</span>
                  <span className="text-[11px] text-ink-500">从初爻起，共六次</span>
                </div>
                {lastSum && <Tag tone={lastSum === 6 || lastSum === 9 ? 'cinnabar' : 'ink'}>{last}</Tag>}
              </div>

              <div className="flex items-center justify-center gap-8 py-7">
                {coins.map((face, i) => (
                  <Coin key={`${tossSeq}-${i}`} side={face} rolling={rolling} size={76} delayMs={i * 40} />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <ProgressDots
                  values={Array.from({ length: 6 }, (_, i) => ({
                    yang: values[i] === 7 || values[i] === 9,
                    moving: values[i] === 6 || values[i] === 9,
                  }))}
                />

              </div>

              <div className="mt-5">
                <Button size="lg" block onClick={doToss} disabled={rolling || complete}>
                  {complete ? '六爻已齐' : rolling ? '掷币中…' : values.length === 0 ? '起 卦（初爻）' : `摇第 ${values.length + 1} 爻`}
                </Button>
              </div>

              <div className="mt-3 flex justify-center">
                <Button variant="line" size="sm" onClick={() => setSheet('manual')}>
                  手动指定卦象
                </Button>
              </div>

              {stats && (
                <details className="mt-3">
                  <summary className="cursor-pointer list-none font-mono text-[10.5px] text-ink-400 hover:text-ink-600">
                    ⓘ 随机源与分布自检
                  </summary>
                  <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-ink-400">
                    Web Crypto · 实测 {stats.total} 掷：字/背 {stats.faceCounts[2]}/{stats.faceCounts[3]}
                    （字 {(stats.faceRatio * 100).toFixed(2)}%，理论 50%）；爻值 6/7/8/9 理论
                    12.5 / 37.5 / 37.5 / 12.5%，实测最大偏差 {stats.maxDeviation.toFixed(2)}pp
                  </p>
                </details>
              )}
            </div>

            {/* 补充（选填） */}
            <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--hairline)' }}>
              <details>
                <summary className="cursor-pointer list-none text-[11.5px] tracking-[0.04em] text-ink-500">
                  补充（选填）· 所问 / 性别 / 婚否 / 起卦时间
                </summary>
                <div className="mt-3 space-y-3">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="所问何事（只作记录与解卦素材）"
                    className="h-10 w-full bg-transparent px-0 text-[14px] text-ink-900 outline-none placeholder:text-ink-400"
                    style={{ borderBottom: '1px solid var(--hairline)' }}
                  />
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11.5px] text-ink-500">性别</span>
                      {(['男', '女'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={`press text-[13px] ${gender === g ? 'font-medium text-ink-900' : 'text-ink-500'}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11.5px] text-ink-500">婚否</span>
                      {(['unmarried', 'married'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMarital(m)}
                          className={`press text-[13px] ${marital === m ? 'font-medium text-ink-900' : 'text-ink-500'}`}
                        >
                          {m === 'unmarried' ? '未婚' : '已婚'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[11.5px] text-ink-500">
                      起卦时间{timeInfo ? `　${timeInfo.monthBranch}月 ${timeInfo.dayGz}日` : ''}
                    </span>
                    <input
                      type="datetime-local"
                      value={timeInput}
                      onChange={(e) => {
                        setAutoTime(false);
                        setTimeInput(e.target.value);
                      }}
                      className="bg-transparent text-[12.5px] text-ink-800 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAutoTime(true);
                        setTimeInput(nowTimeInput());
                      }}
                      className="press text-[11.5px] text-mist-700 underline-offset-4 hover:underline"
                    >
                      归位当前
                    </button>
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* PC 右栏：说明与最近一卦（空态） */}
          <aside className="mt-8 hidden min-w-0 lg:mt-0 lg:block lg:pt-6">
            <div
              className="bg-paper-0 px-6 py-6"
              style={{ border: '1px solid var(--hairline)', borderRadius: 4 }}
            >
              <h2 className="font-song text-[13.5px] font-semibold tracking-[0.2em] text-ink-900">起卦说明</h2>
              <div className="mt-3 max-w-[380px] space-y-2.5 text-[12.5px] leading-[1.85] text-ink-700">
                <p>三枚铜钱一掷：字面记 2、背面记 3，和为爻值（六老阴 · 七少阳 · 八少阴 · 九老阳）。</p>
                <p>老阴老阳为动爻；六爻皆静即静卦，可由宜变法立小成图之卦。</p>
                <p>随机数取自 Web Crypto，逐位取用、无模偏差。</p>
              </div>
              <div className="mt-6 pt-4 text-[12px] leading-[1.9] text-ink-500" style={{ borderTop: '1px solid var(--hairline)' }}>
                <p className="font-song text-[12.5px] text-ink-700">事无大小，一念既起即是问。</p>
                <p className="mt-1">一事一占：同一事反复起卦，卦不应人。</p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* 手动指定抽屉 */}
      {sheet === 'manual' && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/30 backdrop-blur-[2px]" onClick={() => setSheet('none')}>
          <div
            className="w-full max-w-[560px] rounded-t-lg bg-paper-0 px-5 pb-6 pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-song text-[15px] font-semibold tracking-[0.08em] text-ink-900">手动指定</h3>
              <button type="button" onClick={() => setSheet('none')} className="press text-[12px] text-ink-500">
                关闭
              </button>
            </div>

            <GuaPicker label="本卦" value={benBinary} onChange={setBenBinary} />

            <details className="mt-5">
              <summary className="cursor-pointer list-none text-[11.5px] text-ink-500">
                变卦：<span className="font-song text-[12px] text-ink-800">{SIXTY_FOUR_HEXAGRAMS[zhiBinary]?.name}</span>
                <span className="ml-1 text-ink-400">（点开可改；与本卦相同即静卦）</span>
              </summary>
              <div className="mt-3">
                <GuaPicker label="变卦" value={zhiBinary} onChange={setZhiBinary} />
              </div>
            </details>

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

      {/* 卦成选择入口 */}
      {sheet === 'choose' && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/30 backdrop-blur-[2px]" onClick={() => setSheet('none')}>
          <div
            className="w-full max-w-[560px] rounded-t-lg bg-paper-0 px-5 pb-6 pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-song text-[17px] font-semibold tracking-[0.08em] text-ink-900">
                  {SIXTY_FOUR_HEXAGRAMS[values.map((v) => (v === 7 || v === 9 ? '1' : '0')).join('')]?.name ?? '六爻已齐'}
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

'use client';

/**
 * 首页 · 起卦（按用户给的书卷风设计参考重做）
 * =================================================
 * 视觉：浅宣纸 + 墨色 + 赭金 + 一点黛绿/朱砂；淡墨山水只作背景，不压交互。
 * 结构：顶部四入口 → 山水题签 → 一张完整纸笺（求测信息 / 三钱 / 进度 / 爻象 / 主按钮）。
 * 移动端自然单列；PC 用宽纸笺与完整留白呈现，不是把手机布局硬拉宽。
 *
 * 起卦使用真实三枚 Web Crypto 币面。点数 8 显示「背背字」；每次掷钱的显示面就是实际随机面。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, PenLine } from 'lucide-react';
import { Coin, type CoinSide } from '@/components/liuyao/Coin';
import GuaCombobox from './GuaCombobox';
import { Button } from '@/components/ui';
import { HexagramSvg } from '@/components/hexagram/HexagramSvg';
import { tossThree } from '@/lib/liuyao/random';
import { encodeCastState } from '@/lib/liuyao/cast-url';
import { castTimeInfo, nowTimeInput, parseTimeInput } from '@/lib/liuyao/ganzhi';
import { masksOf, movingLineNumbers } from '@/lib/hexagram/hex-math';
import type { CoinResult } from '@/components/liuyao/types';
import { SIXTY_FOUR_HEXAGRAMS } from '@/lib/liuyao/najia';
import InkLandscape from '@/components/site/InkLandscape';
import SiteHeader from '@/components/site/SiteHeader';

const POS_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

function lineDescription(sum: CoinResult): string {
  switch (sum) {
    case 6:
      return '老阴 · 交（动）';
    case 7:
      return '少阳 · 单';
    case 8:
      return '少阴 · 拆';
    case 9:
      return '老阳 · 重（动）';
  }
}

function facesForValue(sum: CoinResult): CoinSide[] {
  switch (sum) {
    case 6: return ['字', '字', '字'];
    case 7: return ['背', '字', '字'];
    case 8: return ['背', '背', '字'];
    case 9: return ['背', '背', '背'];
  }
}

export default function CastPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [timeInput, setTimeInput] = useState('');
  const [autoTime, setAutoTime] = useState(true);

  const [values, setValues] = useState<CoinResult[]>([]);
  const [coins, setCoins] = useState<CoinSide[]>(['字', '背', '字']);
  const [rolling, setRolling] = useState(false);
  const [tossKey, setTossKey] = useState(0);
  const [lastSum, setLastSum] = useState<CoinResult | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const timeInputRef = useRef<HTMLInputElement | null>(null);
  const settledRef = useRef(false);

  const [sheet, setSheet] = useState<'none' | 'manual' | 'choose'>('none');
  const [benBinary, setBenBinary] = useState('111111');
  const [zhiBinary, setZhiBinary] = useState('111111');

  useEffect(() => {
    setTimeInput(nowTimeInput());
    return () => {
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    };
  }, []);

  const timeInfo = useMemo(() => {
    if (!timeInput) return null;
    try {
      return castTimeInfo(parseTimeInput(autoTime ? nowTimeInput() : timeInput));
    } catch {
      return null;
    }
  }, [timeInput, autoTime]);

  const castCount = values.length;
  const complete = castCount === 6;
  const last = castCount ? values[castCount - 1] : null;
  const { primary, moving: movingMask } = masksOf(values);
  const movingList = movingLineNumbers(values);
  const baseName = complete
    ? SIXTY_FOUR_HEXAGRAMS[values.map((v) => (v === 7 || v === 9 ? '1' : '0')).join('')]?.name
    : null;

  const finishToss = useCallback(
    (sum: CoinResult) => {
      if (settledRef.current) return;
      settledRef.current = true;
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
      setRolling(false);
      const next = [...values, sum];
      setValues(next);
      setLastSum(sum);
      if (autoTime) setTimeInput(nowTimeInput());
      if (next.length === 6) setSheet('choose');
    },
    [values, autoTime],
  );

  const doToss = useCallback(() => {
    if (rolling || complete) return;
    // 直接显示 Web Crypto 实际抽到的三枚币面，不从和值拼代表组合。
    const faces = tossThree();
    const sum = faces.reduce<number>((total, face) => total + face, 0) as CoinResult;
    settledRef.current = false;
    setCoins(faces.map((face) => (face === 2 ? '字' : '背')));
    setLastSum(sum);
    setTossKey((k) => k + 1);
    setRolling(true);
    // 以最后一枚 animationend 为主路径；reduced-motion/WebView 丢事件时用计时兜底。
    settleTimerRef.current = window.setTimeout(() => finishToss(sum), 1250);
  }, [rolling, complete, finishToss]);

  const reset = () => {
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settledRef.current = true;
    setRolling(false);
    setValues([]);
    setCoins(['字', '背', '字']);
    setLastSum(null);
    setTossKey((k) => k + 1);
    setSheet('none');
    setAutoTime(true);
    setTimeInput(nowTimeInput());
  };

  const manualMoving = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < 6; i += 1) if (benBinary[i] !== zhiBinary[i]) out.push(i + 1);
    return out;
  }, [benBinary, zhiBinary]);
  const manualStatic = manualMoving.length === 0;

  const manualCommit = () => {
    const bits = benBinary.split('');
    const next = bits.map((b, i) => {
      const isMoving = manualMoving.includes(i + 1);
      const yang = b === '1';
      if (!isMoving) return (yang ? 7 : 8) as CoinResult;
      return (yang ? 9 : 6) as CoinResult;
    });
    setCoins(facesForValue(next[5]));
    setValues(next);
    setLastSum(next[5]);
    setSheet('choose');
    if (autoTime) setTimeInput(nowTimeInput());
  };

  const go = () => {
    const qs = encodeCastState({
      coins: values,
      timeInput: autoTime ? nowTimeInput() : timeInput,
      gender,
      marital: 'unmarried',
      question,
    });
    router.push(`/liuyao?${qs}`);
  };

  const titleName = complete
    ? SIXTY_FOUR_HEXAGRAMS[values.map((v) => (v === 7 || v === 9 ? '1' : '0')).join('')]?.name
    : null;

  return (
    <div className="min-h-screen bg-[#F4F1E8] pb-24 text-[#38423C] sm:pb-0">
      {/* 顶部导航：易林寻踪 · 六爻 / 古籍 / 历史排盘 */}
      <SiteHeader active="liuyao" maxWidthClassName="max-w-[1200px]" />

      {/* 山水题签：移动端不占首屏（首屏要放得下整张求测笺），PC 保留 */}
      <section className="relative isolate hidden overflow-hidden sm:block">
        <InkLandscape />
        <div className="relative z-10 mx-auto flex min-h-[118px] w-full max-w-[1200px] flex-col items-center justify-center px-4 pb-5 pt-2 text-center lg:min-h-[136px] lg:pb-6">
          <p className="font-kai text-[18px] tracking-[0.24em] text-[#8E6337] sm:text-[19px] lg:text-[22px]">
            取象于天地，观变于阴阳
          </p>
        </div>
      </section>

      {/* 主纸笺：PC 扩展为宽幅宣纸，内容仍沿中轴排列 */}
      <main className="relative z-10 mx-auto mt-3 w-full max-w-[960px] px-3 pb-16 sm:-mt-7 sm:px-5 lg:px-8">
        <div
          className="relative overflow-hidden bg-[#FCF9F0] px-4 py-5 sm:px-7 sm:py-7 lg:px-12 lg:py-9"
          style={{ border: '1px solid rgba(179,160,125,0.52)', borderRadius: 14, boxShadow: '0 8px 30px rgba(64,69,60,0.10)' }}
        >
          {/* 纸面云纹水印 */}
          <span className="pointer-events-none absolute right-5 top-10 select-none font-song text-[56px] text-[#D9CDAF]/25 sm:right-10 sm:text-[74px]" aria-hidden>
            ☁
          </span>

          {/* 求测信息 */}
          <section className="relative z-10">
            <label htmlFor="q" className="flex items-center gap-3 font-song text-[17px] font-semibold tracking-[0.08em] text-[#3C4038]">
              <span className="h-6 w-[4px] bg-[#B08A4D]" />
              所问何事
            </label>
            <input
              id="q"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={120}
              placeholder="如：这个项目月底前能否落地"
              className="mt-1.5 h-12 w-full border-0 border-b border-[#D7CDB8] bg-transparent px-7 font-song text-[16px] text-[#36423A] outline-none placeholder:text-[#A6A092] focus:border-[#8E6337]"
            />

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-[#D7CDB8]/80 px-2 pb-4 sm:gap-x-7">
              <div className="flex items-center gap-3">
                <span className="font-song text-[13px] text-[#665F52]">性别</span>
                <div className="flex items-center overflow-hidden rounded-full border border-[#D0C6B2]">
                  {(['男', '女'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`press min-h-[36px] min-w-[54px] px-3 font-song text-[13px] transition-colors ${
                        gender === g ? 'bg-[#DDE4D8] text-[#334B40]' : 'bg-transparent text-[#8A8476]'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2 py-4">
              <Clock3 size={16} strokeWidth={1.6} className="text-[#98784A]" />
              <span className="font-song text-[13px] text-[#665F52]">起卦</span>
              <input
                ref={timeInputRef}
                type="datetime-local"
                value={timeInput}
                onChange={(e) => {
                  setAutoTime(false);
                  setTimeInput(e.target.value);
                }}
                className="no-native-picker h-9 max-w-[195px] border-0 bg-transparent p-0 font-mono text-[13px] tabular-nums text-[#534F45] outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  // 原生选择器图标被隐藏，这里显式唤起；不支持 showPicker 的浏览器退回聚焦
                  const el = timeInputRef.current;
                  if (!el) return;
                  el.focus();
                  if (typeof el.showPicker === 'function') {
                    try {
                      el.showPicker();
                    } catch {
                      /* 非用户手势等情况下浏览器会拒绝，忽略 */
                    }
                  }
                }}
                className="press inline-flex h-7 items-center rounded-[3px] border border-[#CBBFA8] px-2 font-song text-[11.5px] text-[#6E6A5C] transition-colors hover:border-[#9A7040] hover:text-[#8E6337]"
              >
                修改
              </button>
              {timeInfo && (
                <span className="w-full pl-[29px] font-song text-[12px] tracking-[0.08em] text-[#786F5F] sm:w-auto sm:pl-0">
                  {timeInfo.ganzhiText}
                </span>
              )}
            </div>
          </section>

          {/* 三钱 */}
          <section className="relative z-10 border-t border-[#D7CDB8]/80 pt-4 sm:pt-5">
            <div className="flex items-center justify-center gap-3 font-song text-[15px] tracking-[0.26em] text-[#4B5148]">
              <span className="h-px w-7 bg-[#B89C6C]/70" />
              三钱摇卦
              <span className="h-px w-7 bg-[#B89C6C]/70" />
            </div>

            <div
              className={`relative mx-auto mt-1 flex min-h-[112px] max-w-[490px] items-center justify-center gap-5 py-2 sm:min-h-[130px] sm:gap-7 ${!complete && !rolling ? 'cursor-pointer' : ''}`}
              onClick={!complete && !rolling ? doToss : undefined}
              role={!complete && !rolling ? 'button' : undefined}
              aria-label={!complete && !rolling ? '掷钱' : undefined}
            >
              <svg className="pointer-events-none absolute inset-x-0 top-1/2 h-[118px] w-full -translate-y-1/2 sm:h-[136px]" viewBox="0 0 620 160" fill="none" aria-hidden="true">
                <path d="M34 80 C78 22 181 12 307 26 C444 12 543 34 586 79 C552 125 451 146 311 132 C174 145 75 128 34 80Z" stroke="#B7A681" strokeOpacity=".26" strokeWidth="3" strokeDasharray="3 3" />
                <path d="M49 82 C96 35 197 28 308 38 C425 27 522 43 570 79 C527 111 429 128 309 120 C192 132 96 115 49 82Z" stroke="#B7A681" strokeOpacity=".18" strokeWidth="1.5" />
              </svg>
              {coins.map((face, i) => (
                <Coin
                  key={`${tossKey}-${castCount}-${i}`}
                  side={face}
                  rolling={rolling}
                  delayMs={i * 40}
                  rotateDeg={[-7, 4, -3][i] ?? 0}
                  onSettled={i === 2 && rolling && lastSum !== null ? () => finishToss(lastSum) : undefined}
                />
              ))}
            </div>

            <div className="mx-auto flex max-w-[520px] items-center justify-between gap-3 px-3">
              <div className="flex min-w-0 items-center gap-3">
              <div className="flex shrink-0 items-center gap-[9px]">
                {Array.from({ length: 6 }, (_, i) => {
                  const v = values[i];
                  const yang = v === 7 || v === 9;
                  const isMoving = v === 6 || v === 9;
                  const filled = v !== undefined;
                  return (
                    <span key={i} className="relative flex h-[11px] w-[11px] items-center justify-center rounded-full border" style={{ borderColor: isMoving ? '#A8453C' : filled ? '#3E4640' : '#B8AD96' }} aria-label={`第${i + 1}爻${filled ? (yang ? ' 阳' : ' 阴') : ' 未起'}`}>
                      {filled && <span className="h-[5px] w-[5px] rounded-full" style={{ background: isMoving ? '#A8453C' : yang ? '#344039' : '#899A9D' }} />}
                    </span>
                  );
                })}
              </div>
              <span className="truncate font-song text-[12px] tracking-[0.04em] text-[#577365]">
                {last ? `${POS_NAMES[castCount - 1]}　${lineDescription(last)}` : '尚未掷钱'}
              </span>
              </div>
            </div>

            {/* 爻象生成台：移到钱下方 */}
            <div className="mx-auto mt-4 max-w-[600px] border-t border-[#D7CDB8]/75 pt-3">
              <div className="mb-2 flex items-center justify-center gap-3 font-song text-[12.5px] tracking-[0.28em] text-[#575A50]">
                <span className="h-px w-6 bg-[#B89C6C]/65" />卦 象<span className="h-px w-6 bg-[#B89C6C]/65" />
              </div>
              <div className="flex justify-center py-2">
              <div className="flex w-[190px] flex-col gap-[8px] sm:w-[230px]">
                {Array.from({ length: 6 }, (_, idx) => {
                  const pos = 6 - idx;
                  const v = values[pos - 1];
                  const yang = v === 7 || v === 9;
                  const moving = v === 6 || v === 9;
                  const color = !v ? '#D7D1C4' : moving ? '#A8453C' : '#3E4640';
                  return (
                    <div key={pos} className="flex h-[6px] items-center justify-center gap-3">
                      <span className="w-5 text-right font-song text-[9px] text-[#9A8B70]">{POS_NAMES[pos - 1].replace('爻', '')}</span>
                      {yang ? (
                        <span className="h-[3px] w-[126px]" style={{ background: color }} />
                      ) : (
                        <span className="flex w-[126px] justify-between gap-3">
                          <span className="h-[3px] flex-1" style={{ background: color }} />
                          <span className="h-[3px] flex-1" style={{ background: color }} />
                        </span>
                      )}
                      <span className="w-4 text-center font-song text-[9px] text-[#A8453C]">{moving ? (yang ? '○' : '×') : ''}</span>
                    </div>
                  );
                })}
              </div>
              </div>
              <p className="mt-1 text-center font-kai text-[11.5px] tracking-[0.1em] text-[#928774]">
                自初爻起，自下而上{movingList.length ? `　·　动 ${movingList.map((p) => POS_NAMES[p - 1]).join('、')}` : ''}
              </p>
            </div>

            {/* 墨绿漆面 + 赭金双边按钮（移动端改由底部悬浮条承载） */}
            <div className="mx-auto mt-5 hidden max-w-[360px] items-stretch gap-2.5 sm:flex">
              <div className="flex-1 rounded-[6px] border border-[#9C7A48] p-[2px] shadow-[0_2px_7px_rgba(96,76,43,0.16)]">
                <button type="button" disabled={rolling || complete} onClick={doToss} className="press h-[50px] w-full rounded-[4px] border border-[#D8C392]/50 bg-[linear-gradient(180deg,#456557_0%,#29453B_100%)] font-song text-[17px] font-medium tracking-[0.4em] text-[#F5E9CB] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-colors hover:bg-[#223D34] disabled:cursor-not-allowed disabled:opacity-60">
                  {rolling ? '铜钱翻落' : complete ? '六爻已备' : '掷钱起爻'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSheet('manual')}
                className="press h-[50px] w-[76px] shrink-0 self-center rounded-[4px] border border-[#9C7A48] bg-[#FBF7EC] font-song text-[13px] tracking-[0.14em] text-[#3F4A42] shadow-[0_2px_7px_rgba(96,76,43,0.14)] transition-colors hover:border-[#8E6337] hover:text-[#8E6337]"
              >
                指定
              </button>
            </div>

            <div className="mt-3 flex flex-col items-center gap-2.5">
              {castCount > 0 && (
                <button type="button" onClick={reset} className="press font-song text-[12px] text-[#6D746A] hover:text-[#8E6337]">
                  重新起卦
                </button>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* 手动指定卦 */}
      {sheet === 'manual' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-ink-900/30 px-3 backdrop-blur-[2px] sm:px-5" onClick={() => setSheet('none')}>
          <div className="w-full max-w-[620px] overflow-y-auto rounded-md bg-paper-0 px-5 pb-6 pt-4 shadow-[0_0_30px_rgba(53,45,31,0.15)] sm:border sm:border-line-strong" style={{ maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-song text-[16px] font-semibold tracking-[0.12em] text-ink-900">手动指定卦象</h3>
              <button type="button" onClick={() => setSheet('none')} className="press tap text-[12px] text-ink-500">关闭</button>
            </div>
            <GuaCombobox label="本卦" value={benBinary} onChange={setBenBinary} hint="输入卦名可筛选" />
            <div className="mt-4">
              <GuaCombobox label="变卦" value={zhiBinary} onChange={setZhiBinary} hint="本卦与变卦相同即静卦" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 bg-[#F2EEE3] px-3 py-2.5 text-[12px] text-ink-700">
              <span className="font-song">{SIXTY_FOUR_HEXAGRAMS[benBinary]?.name}　之　{SIXTY_FOUR_HEXAGRAMS[zhiBinary]?.name}</span>
              <span className={manualStatic ? 'text-mist-700' : 'text-cinnabar-600'}>{manualStatic ? '静卦 · 宜变法立之卦' : `动爻 ${manualMoving.map((p) => POS_NAMES[p - 1]).join('、')}`}</span>
            </div>
            <div className="mt-4"><Button size="lg" block onClick={manualCommit} className="!bg-mist-900 hover:!bg-ink-900">确定此卦</Button></div>
          </div>
        </div>
      )}

      {/* 移动端：起卦按钮悬浮在底部，单手可及 */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-[#D7CDB8] bg-[#F6F2E9]/95 px-4 pt-2.5 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-[420px] items-stretch gap-2.5">
          <div className="flex-1 rounded-[6px] border border-[#9C7A48] p-[2px] shadow-[0_2px_10px_rgba(96,76,43,0.18)]">
            <button
              type="button"
              disabled={rolling || complete}
              onClick={doToss}
              className="press h-[48px] w-full rounded-[4px] border border-[#D8C392]/50 bg-[linear-gradient(180deg,#456557_0%,#29453B_100%)] font-song text-[16px] font-medium tracking-[0.36em] text-[#F5E9CB] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-colors hover:bg-[#223D34] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rolling ? '铜钱翻落' : complete ? '六爻已备' : '掷钱起爻'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSheet('manual')}
            className="press h-[48px] w-[72px] shrink-0 self-center rounded-[4px] border border-[#9C7A48] bg-[#FBF7EC] font-song text-[13px] tracking-[0.14em] text-[#3F4A42] shadow-[0_2px_7px_rgba(96,76,43,0.14)] transition-colors hover:border-[#8E6337] hover:text-[#8E6337]"
          >
            指定
          </button>
        </div>
      </div>

      {/* 卦成：直接进六爻排盘 */}
      {sheet === 'choose' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/30 px-3 backdrop-blur-[2px] sm:px-5" onClick={() => setSheet('none')}>
          <div className="w-full max-w-[440px] border border-[#CDBB96] bg-[#FCF8EF] px-5 pb-6 pt-5 shadow-[0_18px_50px_rgba(53,45,31,0.22)]" style={{ borderRadius: 10 }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-kai text-[10.5px] tracking-[0.18em] text-[#9A805A]">卦象已成</p>
                <h3 className="mt-1 font-song text-[20px] font-semibold tracking-[0.1em] text-ink-900">{baseName ?? '六爻已备'}</h3>
                <p className="mt-1 text-[11.5px] text-ink-600">
                  {movingList.length ? `动爻 ${movingList.map((p) => POS_NAMES[p - 1]).join('、')}` : '六爻安静 · 静卦'}
                </p>
              </div>
              <button type="button" onClick={reset} className="press shrink-0 font-song text-[11.5px] text-ink-500 underline-offset-4 hover:underline">重起</button>
            </div>
            <Button
              variant="line"
              size="lg"
              block
              className="min-h-[52px] flex-col !gap-0.5 border-[#D8C392]/50 bg-[linear-gradient(180deg,#456557_0%,#29453B_100%)] !text-[#F5E9CB] hover:border-[#9C7A48] hover:!text-[#F5E9CB]"
              onClick={go}
            >
              <span>排盘解卦</span>
              <span className="text-[10.5px] font-normal opacity-70">纳甲 · 世应 · 六亲</span>
            </Button>
            <p className="mt-3 text-center font-kai text-[11px] tracking-[0.06em] text-[#938873]">
              {movingList.length ? '卦已成，动爻已标于盘面' : '静卦以本卦象断，不另立变盘'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Coin, type CoinSide } from '@/components/liuyao/Coin';
import { tossStats, tossThree } from '@/lib/liuyao/random';
import {
  AppBar,
  Button,
  Panel,
  Paper,
  ProgressDots,
  Tabs,
  Tag,
  YaoBar,
} from '@/components/ui';

/**
 * 设计稿（S0）
 * ============
 * 不是"组件目录"，而是**起卦页的近似稿** + 盘面/九宫/解卦三个真实区块，
 * 让评审直接看"打开 App 是什么样"。
 */

const SWATCHES = [
  { name: '页底', value: '#EEF2F3', token: 'paper-1' },
  { name: '纸面', value: '#FBFCFA', token: 'paper-0' },
  { name: '区间底', value: '#E4EBED', token: 'paper-2' },
  { name: '发丝线', value: '#DBE4E7', token: 'line' },
  { name: '墨', value: '#1F2A30', token: 'ink-900' },
  { name: '次墨', value: '#5F7278', token: 'ink-600' },
  { name: '雾蓝', value: '#6E8F9C', token: 'mist-600' },
  { name: '雾蓝深', value: '#3C5661', token: 'mist-900' },
  { name: '赭金', value: '#8A6A3A', token: 'gold-600' },
  { name: '朱砂', value: '#A8453C', token: 'cinnabar-600' },
];

const LINES = [
  { god: '玄武', rel: '父母', najia: '辛未土', role: '世', yang: true, moving: true, ch: '父母 甲子水' },
  { god: '白虎', rel: '兄弟', najia: '辛酉金', role: '应', yang: false, moving: false, ch: '兄弟 甲戌土' },
  { god: '螣蛇', rel: '子孙', najia: '辛亥水', role: '', yang: true, moving: false, ch: '' },
];

export default function DesignPage() {
  const [mode, setMode] = useState<'coin' | 'manual'>('coin');
  const [marital, setMarital] = useState<'unmarried' | 'married'>('unmarried');
  const [dots, setDots] = useState(3);
  const [skin, setSkin] = useState<'mist' | 'paper'>('mist');
  const [coins, setCoins] = useState<CoinSide[]>(['字', '背', '字']);
  const [rolling, setRolling] = useState(false);
  const [tossSeq, setTossSeq] = useState(0);
  const [stats, setStats] = useState<ReturnType<typeof tossStats> | null>(null);

  const doToss = () => {
    if (rolling) return;
    const [a, b, c] = tossThree();
    setRolling(true);
    setTossSeq((n) => n + 1);
    window.setTimeout(() => {
      setCoins([a === 2 ? '字' : '背', b === 2 ? '字' : '背', c === 2 ? '字' : '背']);
      setRolling(false);
    }, 940);
  };

  React.useEffect(() => {
    setStats(tossStats(2000));
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.skin = skin;
    return () => {
      delete document.documentElement.dataset.skin;
    };
  }, [skin]);

  const values = [
    { yang: false, moving: true },
    { yang: false, moving: false },
    { yang: true, moving: false },
    { yang: false, moving: false },
    { yang: true, moving: false },
    { yang: true, moving: false },
  ];

  return (
    <div className="min-h-screen bg-paper-1 pb-16">
      <AppBar
        title="六爻"
        subtitle="三钱摇卦 · 一事一占"
        right={
          <div className="flex items-center gap-2">
            {(['mist', 'paper'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSkin(k)}
                className={`press text-[11.5px] ${
                  skin === k ? 'font-medium text-ink-900 underline underline-offset-4' : 'text-ink-500'
                }`}
              >
                {k === 'mist' ? '雾蓝' : '宣纸米'}
              </button>
            ))}
          </div>
        }
      />

      <main className="mx-auto w-full max-w-[520px] px-5 lg:max-w-[1080px] lg:px-8">
        {/* PC：案头两页（左起卦与盘面 / 右九宫与解卦），移动：单栏顺序流 */}
        <div className="lg:grid lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-10 lg:items-start">
        <div className="min-w-0">
        {/* 起卦 */}
        <Panel title="起卦" hint="从初爻起，共六次">
          <Tabs
            value={mode}
            onChange={setMode}
            options={[
              { id: 'coin', label: '三钱摇卦' },
              { id: 'manual', label: '手动指定' },
            ]}
          />

          <div className="mt-5">
            {/* 铜钱：真实照片正反两面，3D 翻滚后停在结果面 */}
            <div className="flex items-center justify-center gap-8 py-3">
              {coins.map((face, i) => (
                <Coin key={`${tossSeq}-${i}`} side={face} rolling={rolling} delayMs={i * 40} rotateDeg={[-9, 6, -4][i] ?? 0} />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <ProgressDots values={values.slice(0, dots)} />
              <Tag tone="mist">{dots}/6</Tag>
            </div>

            <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
              字面为 2 · 背面为 3 · 2+2+3 = 7（少阳）
            </p>
            {stats && (
              <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-ink-400">
                随机源自检（Web Crypto · 实测 {stats.total} 掷）：字 {stats.faceCounts[2]} / 背 {stats.faceCounts[3]}，
                字面占比 {(stats.faceRatio * 100).toFixed(2)}%（理论 50%），爻值最大偏差 {stats.maxDeviation.toFixed(2)}pp
              </p>
            )}

            <div className="mt-4">
              <Button size="lg" block onClick={doToss} disabled={rolling}>
                {rolling ? '掷币中…' : dots === 0 ? '起 卦（初爻）' : `摇第 ${dots + 1} 爻`}
              </Button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button type="button" className="press text-[12.5px] text-ink-600 underline-offset-4">
                手动指定卦象
              </button>
              <span className="text-[11.5px] text-ink-400">癸未日 未时 · 旬空申酉</span>
            </div>

            {/* 选填：收在主按钮之下，不抢首屏动作 */}
            <details className="mt-4 pt-3" style={{ borderTop: '1px solid var(--hairline)' }}>
              <summary className="cursor-pointer list-none text-[11.5px] tracking-[0.04em] text-ink-500">
                补充（选填）· 性别 / 婚否 / 起卦时间
              </summary>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11.5px] text-ink-500">性别</span>
                  {['男', '女'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`press text-[13.5px] ${g === '女' ? 'font-medium text-ink-900' : 'text-ink-500'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11.5px] text-ink-500">婚否</span>
                  {(['未婚', '已婚'] as const).map((label, i) => {
                    const id = i === 0 ? 'unmarried' : 'married';
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMarital(id as 'married' | 'unmarried')}
                        className={`press text-[13.5px] ${marital === id ? 'font-medium text-ink-900' : 'text-ink-500'}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
                婚否只作落款记录，不参与排盘计算。
              </p>
            </details>
          </div>
        </Panel>

        <div className="hair-t" />

        {/* 盘面 */}
        <Panel title="盘面" hint="天风姤 之 乾为天">
          <Paper>
            <div className="mb-2 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-song text-[20px] font-semibold tracking-[0.08em] text-ink-900">天风姤</span>
                <span className="text-[11px] text-ink-500">乾宫 · 金 · 归魂</span>
              </div>
              <Tag tone="cinnabar" mark="▸">
                初爻动
              </Tag>
            </div>

            <div className="mb-1 flex items-center justify-between text-[10.5px] tracking-[0.06em] text-ink-400">
              <span>六神 · 六亲纳甲</span>
              <span>变卦</span>
            </div>

            {LINES.map((l, i) => (
              <div key={i} className="flex items-center gap-2 py-[9px]">
                <span className="w-8 shrink-0 text-[11.5px] text-ink-500">{l.god}</span>
                <span className="w-[76px] shrink-0 text-[13px] text-ink-900">
                  <b className="font-semibold">{l.rel}</b>
                  <span className="ml-0.5 font-mono text-[12px] tabular-nums">{l.najia}</span>
                </span>
                <YaoBar yang={l.yang} moving={l.moving} width={46} height={6} />
                <span
                  className={`w-4 shrink-0 text-center font-song text-[12px] ${
                    l.role === '世' ? 'text-cinnabar-600' : 'text-mist-700'
                  }`}
                >
                  {l.role}
                </span>
                <span className="min-w-0 flex-1 truncate text-right text-[11.5px] text-ink-500">{l.ch}</span>
              </div>
            ))}

            <div className="mt-3 flex items-center gap-3 pt-2.5 text-[11px] text-ink-500" style={{ borderTop: '1px solid var(--hairline)' }}>
              <Tag tone="ink" mark="○">
                用神 父母丑土
              </Tag>
              <Tag tone="ink" mark="◌">
                静卦可用宜变法
              </Tag>
            </div>
          </Paper>
        </Panel>

        </div>

        <div className="min-w-0">
        <div className="hair-t lg:hidden" />

        {/* 解卦 */}
        <Panel title="解卦" hint="四段 · 400–550 字">
          <p className="indent-8 font-song text-[15.5px] leading-[1.95] text-ink-800">
            所问为丈夫升职，取官鬼为用——官鬼持世而动，得日辰生扶，是事在我手之象。
            世应之间无冲无合，进神未成，先立在一个「缓」字上。
          </p>
          <p className="mt-3 text-[11.5px] text-ink-500">
            正文用宋体、字号 15.5、行高 1.95；不加粗、不加色块，只有段落与空行。
          </p>
        </Panel>

        <div className="hair-t" />

        {/* 控件对照 */}
        <Panel title="控件" hint="触控 ≥44px">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button block>主按钮</Button>
              <Button variant="line" block>
                次按钮
              </Button>
              <Button variant="text" block>
                文字
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Tag tone="gold">用神</Tag>
              <Tag tone="cinnabar">动爻</Tag>
              <Tag tone="mist">4/6</Tag>
              <Tag tone="ink">静卦</Tag>
            </div>
          </div>
        </Panel>

        <div className="hair-t" />

        {/* 色板与字号 */}
        <Panel title="色板" hint="点按复制">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {SWATCHES.map((s) => (
              <button
                key={s.token}
                type="button"
                onClick={() => navigator.clipboard?.writeText(s.value)}
                className="press flex items-center gap-2.5 py-1 text-left"
              >
                <span
                  className="h-7 w-7 shrink-0"
                  style={{ background: s.value, border: '1px solid var(--hairline)' }}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block truncate text-[12px] text-ink-800">{s.name}</span>
                  <span className="block truncate font-mono text-[10px] text-ink-500">{s.value}</span>
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="字号" hint="正文无衬线 · 卦名/解卦用宋">
          <div className="space-y-2">
            <div className="font-song text-[26px] font-semibold tracking-[0.08em] text-ink-900">天风姤</div>
            <div className="font-song text-[16px] text-ink-800">一、取用 · 父母丑土持世</div>
            <div className="text-[15px] leading-[1.8] text-ink-800">界面正文 15px：按钮、标签、说明文字用无衬线。</div>
            <div className="font-song text-[15.5px] leading-[1.95] text-ink-800">解卦正文 15.5px：宋体，行高 1.95。</div>
            <div className="font-mono text-[11.5px] tabular-nums text-ink-500">丙午年 戊戌月 癸未日 · 0/6 → 6/6</div>
          </div>
        </Panel>
        </div>
        </div>
      </main>

    </div>
  );
}

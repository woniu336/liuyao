'use client';

/**
 * 六爻盘面：只呈现确定性排盘事实。
 *
 * 版式沿用 bazi-web 的古籍卦单：六神 / 伏神 / 本卦纳甲六亲 / 爻形（世应动） / 变卦 / 注。
 * 不含用神、旺衰、吉凶、应期等任何断语——这些属于上游规则层与 DAG，本仓库刻意不搬。
 */

import React, { useMemo } from 'react';
import type { LiuyaoChart, LiuyaoLine } from '@/lib/liuyao/najia';
import type { CastTimeInfo } from '@/lib/liuyao/ganzhi';

interface ChartBoardProps {
  chart: LiuyaoChart;
  time: CastTimeInfo;
  question?: string;
}

const POS_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

function YaoMark({ line }: { line: LiuyaoLine }) {
  return (
    <div className="flex w-[34px] shrink-0 flex-col items-center gap-1">
      <div className="flex h-[6px] w-[26px] gap-[7px]">
        <span className="h-full flex-1 rounded-[1px]" style={{ background: line.isMoving ? '#a5342b' : '#22201b' }} />
        {!line.isYang && (
          <span className="h-full flex-1 rounded-[1px]" style={{ background: line.isMoving ? '#a5342b' : '#22201b' }} />
        )}
      </div>
      <div className="flex h-[12px] items-center gap-0.5 font-serif text-[10px] leading-none">
        {line.isWorld && <span className="text-[#a5342b]">世</span>}
        {line.isResponse && <span className="text-[#3f6154]">应</span>}
        {line.isMoving && <span className="text-[#a5342b]">{line.isYang ? '○' : '×'}</span>}
      </div>
    </div>
  );
}

/** 一爻各栏：只写干支五行与六亲，不写生克 */
function NajiaCell({ relation, stem, branch, element, dim }: { relation: string; stem: string; branch: string; element: string; dim?: boolean }) {
  return (
    <span className={`font-serif text-[12px] sm:text-[12.5px] ${dim ? 'text-[#9b9385]' : 'text-[#22201b]'}`}>
      <span className={dim ? '' : 'font-semibold'}>{relation}</span>
      <span className="ml-0.5 tracking-tight">{stem}{branch}</span>
      <span className={`ml-0.5 text-[10.5px] ${dim ? 'text-[#a8a094]' : 'text-[#8c8272]'}`}>{element}</span>
    </span>
  );
}

export function boardToText(chart: LiuyaoChart, time: CastTimeInfo, question?: string): string {
  const rows = [...chart.lines].reverse().map((l) => {
    const bar = l.isYang ? '▅▅▅▅▅' : '▅▅  ▅▅';
    const role = l.isWorld ? '世' : l.isResponse ? '应' : '　';
    const moving = l.isMoving ? (l.isYang ? '○' : '×') : '　';
    const hidden = l.hiddenSpirit ? `${l.hiddenSpirit.relation}${l.hiddenSpirit.stem}${l.hiddenSpirit.branch}${l.hiddenSpirit.element}` : '　　　';
    const changed = l.changedLine
      ? `${l.changedLine.relation}${l.changedLine.stem}${l.changedLine.branch}${l.changedLine.element}`
      : chart.changedLines[l.position - 1]
        ? `${chart.changedLines[l.position - 1].relation}${chart.changedLines[l.position - 1].stem}${chart.changedLines[l.position - 1].branch}${chart.changedLines[l.position - 1].element}`
        : '';
    const marks = [l.isVoid ? '空' : '', l.isMonthBroken ? '破' : '', ...l.stars].filter(Boolean).join('/');
    return `${l.sixGod}　${hidden}　${l.relation}${l.stem}${l.branch}${l.element} ${bar} ${role}${moving}　${changed}${marks ? `　[${marks}]` : ''}`;
  });

  const s = chart.shensha;
  const lines = [
    question?.trim() ? `占问：${question.trim()}` : null,
    `起卦：${time.solarText}　${time.lunarText}`,
    `干支：${time.ganzhiText}　旬空：${chart.voidBranches.join('')}　月建：${time.monthBranch}`,
    `神煞：马-${s.yima} 桃-${s.taohua} 禄-${s.lushen} 贵-${s.guiren.join('')} 医-${s.tianyi} 昌-${s.wenchang}`,
    `本卦：${chart.base.name}（${chart.base.palace}宫${chart.base.palaceElement}${chart.base.tags.length ? '·' + chart.base.tags.join('') : ''}）${chart.changed ? `　之　${chart.changed.name}（${chart.changed.palace}宫${chart.changed.palaceElement}）` : '　六爻安静'}`,
    `月卦身：${chart.monthBody.branch}${chart.monthBody.position ? `（${POS_NAMES[chart.monthBody.position - 1]}）` : '（卦身不现）'}`,
    '',
    '六神　伏神　　本卦　　　　　变卦',
    ...rows,
    '',
    '纯确定性排盘 · 不含用神与吉凶',
  ].filter((x) => x !== null) as string[];
  return lines.join('\n');
}

export default function ChartBoard({ chart, time, question }: ChartBoardProps) {
  const [copied, setCopied] = React.useState(false);
  const rows = useMemo(() => [...chart.lines].reverse(), [chart.lines]);
  const hasChanged = Boolean(chart.changed);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(boardToText(chart, time, question));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 隐私模式或未授权：静默 */
    }
  };

  const movingText = chart.movingLines.length
    ? chart.movingLines.map((p) => POS_NAMES[p - 1]).join('、')
    : '六爻安静';

  return (
    <div className="w-full rounded-md border border-[#E0D8C9] bg-[#FFFDF8] p-4 shadow-[0_2px_12px_rgba(23,20,15,0.05)] sm:p-6">
      {/* 顶栏 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-serif text-[11px] tracking-[0.28em] text-[#8c8272]">六爻排盘</span>
            {chart.base.tags.map((t) => (
              <span key={t} className="rounded-[2px] border border-[#d9cdb6] px-1.5 py-[1px] font-serif text-[10px] text-[#8e3a2c]">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-serif text-[#22201b]">
            <span className="text-[19px] font-semibold tracking-wide sm:text-[21px]">{chart.base.name}</span>
            <span className="text-[11.5px] text-[#5e5a50]">
              （{chart.base.palace}宫 · {chart.base.palaceElement}）
            </span>
            {hasChanged ? (
              <>
                <span className="text-[12px] text-[#8c8272]">之</span>
                <span className="text-[17px] font-semibold tracking-wide sm:text-[19px]">{chart.changed?.name}</span>
                <span className="text-[11.5px] text-[#5e5a50]">
                  （{chart.changed?.palace}宫 · {chart.changed?.palaceElement}）
                </span>
              </>
            ) : (
              <span className="text-[11.5px] text-[#8c8272]">六爻安静 · 无变卦</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 cursor-pointer rounded-[2px] border border-[#CBBFA8] px-2.5 py-1 font-serif text-[11.5px] text-[#5E5A50] transition-colors hover:border-[#8A8378] hover:text-[#22201B]"
        >
          {copied ? '已复制' : '复制盘面'}
        </button>
      </div>

      {/* 事实条 */}
      <div className="mt-3 space-y-1 border-y border-[#E4DCCB] py-2 font-serif text-[11.5px] leading-relaxed text-[#5e5a50]">
        {question?.trim() && (
          <div className="text-[#22201b]">
            <span className="mr-1.5 text-[#8c8272]">占问</span>
            {question.trim()}
          </div>
        )}
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[#22201b]">{time.ganzhiText}</span>
          <span className="text-[#cbbfa8]">|</span>
          <span>{time.solarText}</span>
          <span className="text-[#cbbfa8]">|</span>
          <span>{time.lunarText}</span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          <span>
            旬空 <b className="font-semibold text-[#8e3a2c]">{chart.voidBranches.join('')}</b>
          </span>
          <span>月建 {time.monthBranch}</span>
          <span>动爻 {movingText}</span>
          <span>
            月卦身 {chart.monthBody.branch}
            {chart.monthBody.position ? `（${POS_NAMES[chart.monthBody.position - 1]}）` : '（不现）'}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-1 pt-0.5">
          {[
            ['驿马', chart.shensha.yima],
            ['桃花', chart.shensha.taohua],
            ['禄神', chart.shensha.lushen],
            ['贵人', chart.shensha.guiren.join('')],
            ['天医', chart.shensha.tianyi],
            ['文昌', chart.shensha.wenchang],
          ].map(([k, v]) => (
            <span key={k} className="rounded-[2px] bg-[#F4EEE1] px-1.5 py-[1px] text-[10.5px] text-[#6c6354]">
              {k}
              <span className="ml-0.5 text-[#22201b]">{v}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 表头 */}
      <div className="mt-2 flex items-center gap-1.5 border-b border-[#e4dccb] pb-1 font-serif text-[10.5px] tracking-[0.08em] text-[#8c8272]">
        <span className="w-[22px] shrink-0">六神</span>
        <span className="w-[46px] shrink-0">伏神</span>
        <span className="flex-1">本卦</span>
        <span className="w-[34px] shrink-0 text-center">爻象</span>
        <span className="flex-1 text-right sm:text-left">{hasChanged ? '变卦' : ''}</span>
        <span className="w-[62px] shrink-0 text-right">注</span>
      </div>

      {/* 六爻：自上而下 */}
      <div>
        {rows.map((line) => (
          <div
            key={line.position}
            className="flex items-center gap-1.5 border-b border-[#f0e9db] py-[7px] last:border-b-0"
          >
            <span className="w-[22px] shrink-0 font-serif text-[11.5px] text-[#6c6354]">{line.sixGod}</span>
            <span className="w-[46px] shrink-0 overflow-hidden whitespace-nowrap" title={line.hiddenSpirit?.flyRelationDesc || ''}>
              {line.hiddenSpirit ? (
                <span className="font-serif text-[10.5px] text-[#8b7a5e]">
                  {line.hiddenSpirit.relation}
                  {line.hiddenSpirit.stem}
                  {line.hiddenSpirit.branch}
                  {line.hiddenSpirit.element}
                </span>
              ) : (
                <span className="text-[10.5px] text-[#d3cab8]">—</span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <NajiaCell relation={line.relation} stem={line.stem} branch={line.branch} element={line.element} />
            </span>
            <YaoMark line={line} />
            <span className={`min-w-0 flex-1 truncate ${hasChanged ? '' : 'invisible'}`}>
              {hasChanged && chart.changedLines[line.position - 1] && (
                <NajiaCell
                  relation={chart.changedLines[line.position - 1].relation}
                  stem={chart.changedLines[line.position - 1].stem}
                  branch={chart.changedLines[line.position - 1].branch}
                  element={chart.changedLines[line.position - 1].element}
                  dim={!line.isMoving}
                />
              )}
            </span>
            <span className="w-[62px] shrink-0 text-right">
              <span className="flex flex-wrap items-center justify-end gap-0.5">
                {line.isVoid && (
                  <span className="rounded-[2px] border border-[#cfa79b] px-1 font-serif text-[10px] text-[#8e3a2c]">空</span>
                )}
                {line.isMonthBroken && (
                  <span className="rounded-[2px] border border-[#bfb49c] px-1 font-serif text-[10px] text-[#6c6354]">破</span>
                )}
                {line.stars.map((s) => (
                  <span key={s} className="font-serif text-[10px] text-[#9c7a3c]">
                    {s.replace('神', '')}
                  </span>
                ))}
              </span>
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 font-serif text-[10.5px] leading-relaxed text-[#8c8272]">
        纯确定性排盘：纳甲装卦 · 安世应 · 定六亲 · 旬空 · 伏神 · 六神 · 月卦身 · 天医文昌等神煞。
        不含用神取舍、生克旺衰、吉凶断语与应期。
      </p>
    </div>
  );
}

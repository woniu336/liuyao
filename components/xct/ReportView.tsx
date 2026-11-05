'use client';

import React, { useState } from 'react';
import { PalaceJudgment, PalaceNumber, BoardState, ZhengTuiChain } from '@/lib/xct/types';
import { PALACE_NAMES } from '@/lib/xct/constants';

interface ReportViewProps {
  board: BoardState;
  selectedJudgment: PalaceJudgment;
  chain: ZhengTuiChain;
  divineTimeInfo?: {
    solarDateStr: string;
    lunarDateStr: string;
    ganzhiStr: string;
  } | null;
}

/**
 * 盘面详录：宫位释义 + 可复制的盘面提要。
 *
 * 只列结构事实（宫位 / 天地盘 / 重卦 / 四象式 / 中五归藏 / 正推链），
 * 不写「吉凶悔吝」类断语 —— 断语是解读层的事，盘面上给了容易被当成结论。
 */

/** 宫位结构句：只描述天盘地盘与四象式，不给吉凶断语 */
function structureLine(j: PalaceJudgment): string {
  if (j.palace === 5) {
    return `中五宫得「${j.heaven}」，为全盘八方归藏之枢，统摄事态基调。`;
  }
  return `天盘${j.heaven}临地盘${j.earth}，合成【${j.hexName || `${j.heaven}之${j.earth}`}】，成「${j.mode || '中立'}」式。`;
}

export default function ReportView({ board, selectedJudgment, chain, divineTimeInfo }: ReportViewProps) {
  const [activeTab, setActiveTab] = useState<'xct' | 'prompt'>('xct');
  const [copied, setCopied] = useState(false);

  const generatePrompt = () => {
    let prompt = '【小成图盘面事实层】';
    if (divineTimeInfo) {
      prompt += `\n起卦天时：公历 ${divineTimeInfo.solarDateStr} · 干支 ${divineTimeInfo.ganzhiStr} · ${divineTimeInfo.lunarDateStr}`;
    }
    prompt += `\n本卦：${board.ben.upper}上${board.ben.lower}下　变卦：${board.zhi.upper}上${board.zhi.lower}下`;
    prompt += `\n\n一、当前宫位（基础事实）：
• 宫位：${selectedJudgment.palaceName}，天盘【${selectedJudgment.heaven}】，地盘【${selectedJudgment.earth}】
• 合成重卦：${selectedJudgment.hexName || `${selectedJudgment.heaven}之${selectedJudgment.earth}`}，成「${selectedJudgment.mode || '中立'}」式
• 中五极枢：天地归藏得「${board.heaven[5]}」

二、气路正推流转（因果事实）：
• 演化路径：${chain.path.map((p) => PALACE_NAMES[p]).join(' ➔ ')}
• 因果链条：${chain.summary}`;

    prompt += '\n\n━━━━━━━━━━━━━━━━━━━━\n以上为盘面事实摘要（不含用神与吉凶判断），可直接粘到任意大模型继续推演。';
    return prompt;
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatePrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-5 border-b border-[#DED6C6]">
        {(
          [
            ['xct', '宫位释义'],
            ['prompt', '盘面提要'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`cursor-pointer border-b pb-2 font-serif text-[11.5px] tracking-[0.12em] transition-colors ${
              activeTab === key
                ? 'border-[#22201B] text-[#22201B]'
                : 'border-transparent text-[#5E5A50] hover:text-[#22201B]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'xct' && (
        <div className="space-y-2.5 font-serif text-[12.5px] leading-relaxed text-[#2C2A24]">
          <p>{structureLine(selectedJudgment)}</p>
          <div className="space-y-1 border-t border-[#DED6C6] pt-2 text-[11.5px] text-[#5E5A50]">
            <p>
              <strong className="font-semibold text-[#22201B]">中宫枢纽：</strong>
              中五宫得「{board.heaven[5]}」，为天地全盘归藏之宗，统摄八方事态基调。
            </p>
            <p>
              <strong className="font-semibold text-[#22201B]">正推终止：</strong>
              {chain.endReason === 'guiwei'
                ? '归位，气止得位'
                : chain.hasCycle
                  ? '闭环，气路循环'
                  : chain.endReason === 'center'
                    ? '入中宫，气归本质'
                    : '链止于末站'}
              。
            </p>
          </div>
        </div>
      )}

      {activeTab === 'prompt' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-serif text-[11.5px] text-[#5E5A50]">九宫事实层与气路正推链（纯事实，不含用神）</span>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="shrink-0 cursor-pointer rounded-[2px] border border-[#CBBFA8] px-2.5 py-1 font-serif text-[11.5px] text-[#5E5A50] transition-colors hover:border-[#8A8378] hover:text-[#22201B]"
            >
              {copied ? '已复制' : '复制提要'}
            </button>
          </div>
          <pre className="max-h-[300px] overflow-y-auto whitespace-pre-wrap rounded-[2px] border border-[#DED6C6] bg-[#F6F2EA] p-3 font-mono text-[11px] leading-relaxed text-[#22201B]">
            {generatePrompt()}
          </pre>
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import type { HexagramPair, Trigram } from '@/lib/xct/types';
import { SIXTY_FOUR_HEXAGRAMS, TRIGRAM_BITS } from '@/lib/xct/constants';

/**
 * 卦象图：六爻自下而上排（初爻在下），上卦三爻在上、下卦三爻在下。
 *
 * 小成图的盘面本来只有八宫天盘，看不到「本卦／变卦」的整体形象；
 * 这里把它补在九宫上方——先看象，再看宫，读盘的次序才顺。
 * 副标直接取六十四卦名表（如「火风鼎」＝离上巽下），不另造简称。
 *
 * 爻线尺寸走内联 style 而非 Tailwind 任意值：爻是这张图的骨架，
 * 不该因为样式表漏扫一个 h-[8px] 就整幅图塌成空白。
 */

interface HexagramFigureProps {
  hex: HexagramPair;
  /** 本卦 / 变卦 */
  label: string;
  /** 变卦用淡赭收一下，克制到只是一点点色差 */
  accent?: boolean;
}

const YAO_H = 8;
const YAO_GAP = 8;
const FIG_W = 112;

/** 一爻：阳爻整条，阴爻中断 */
function Yao({ yang, ink }: { yang: boolean; ink: string }) {
  if (yang) {
    return <div style={{ height: YAO_H, width: '100%', background: ink, borderRadius: 1 }} />;
  }
  return (
    <div style={{ display: 'flex', height: YAO_H, width: '100%', gap: '25%' }}>
      <div style={{ height: '100%', flex: 1, background: ink, borderRadius: 1 }} />
      <div style={{ height: '100%', flex: 1, background: ink, borderRadius: 1 }} />
    </div>
  );
}

export default function HexagramFigure({ hex, label, accent }: HexagramFigureProps) {
  const name = SIXTY_FOUR_HEXAGRAMS[hex.upper]?.[hex.lower] ?? `${hex.upper}之${hex.lower}`;
  // 初爻在下：先排下卦三爻（初、二、三），再排上卦三爻（四、五、上），渲染时整体反转
  const bits = [...TRIGRAM_BITS[hex.lower as Trigram], ...TRIGRAM_BITS[hex.upper as Trigram]];
  const ink = accent ? '#5A3B31' : '#22201B';

  return (
    <div className="flex flex-col items-center" style={{ gap: 9 }}>
      <span
        className="font-serif"
        style={{
          fontSize: 11,
          letterSpacing: '0.4em',
          paddingLeft: '0.4em',
          color: accent ? 'rgba(142,58,44,0.85)' : '#5E5A50',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: YAO_GAP, width: FIG_W }}>
        {bits
          .slice()
          .reverse()
          .map((b, i) => (
            <Yao key={i} yang={b === 1} ink={ink} />
          ))}
      </div>
      <span
        className="font-serif"
        style={{
          fontSize: 15,
          letterSpacing: '0.1em',
          paddingLeft: '0.1em',
          color: accent ? '#5A3B31' : '#22201B',
          fontFamily: '"Kaiti SC", "KaiTi", "STKaiti", "Noto Serif SC", serif',
        }}
      >
        {name}
      </span>
    </div>
  );
}

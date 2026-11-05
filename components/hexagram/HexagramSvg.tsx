import React from 'react';
import {
  calculateGeometry,
  round2,
  type HexSvgOptions,
} from '@/lib/hexagram/hex-math';

export interface HexagramSvgProps extends HexSvgOptions {
  mask: number;
  lines?: 3 | 6;
  movingMask?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 纯几何无外部图标依赖的高保真六爻矢量组件
 * 按比例几何绘制，天然自适应，支持动爻标记、变卦异或、上下卦间距分离
 */
export const HexagramSvg: React.FC<HexagramSvgProps> = ({
  mask,
  lines = 6,
  movingMask = 0,
  width = 120,
  label,
  split = false,
  filled,
  stagger = false,
  text,
  className = '',
  style,
}) => {
  const geo = calculateGeometry(mask, lines, movingMask, {
    width,
    label,
    split,
    filled,
    text,
  });

  const cls = [
    'hex',
    stagger ? 'stagger' : '',
    filled !== undefined ? 'stage' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      className={cls}
      viewBox={`0 0 ${width} ${geo.height}`}
      width={width}
      height={geo.height}
      role="img"
      aria-label={geo.aria}
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <title>{geo.aria}</title>
      {geo.lines.map((l, i) => {
        if (!l.cast) {
          const y = l.y + (geo.bar - geo.thin) / 2;
          return (
            <g key={l.pos} className="line pending" data-pos={l.pos}>
              <rect
                className="ph"
                x="0"
                y={round2(y)}
                width={width}
                height={round2(geo.thin)}
                rx={round2(geo.thin / 2)}
              />
            </g>
          );
        }

        const lineStyle = stagger ? ({ '--i': i } as React.CSSProperties) : undefined;

        return (
          <g
            key={l.pos}
            className={`line${l.moving ? ' moving' : ''}`}
            data-pos={l.pos}
            style={lineStyle}
          >
            {l.yang ? (
              <rect
                x="0"
                y={round2(l.y)}
                width={width}
                height={round2(geo.bar)}
                rx={round2(geo.radius)}
              />
            ) : (
              <>
                <rect
                  x="0"
                  y={round2(l.y)}
                  width={round2(geo.half)}
                  height={round2(geo.bar)}
                  rx={round2(geo.radius)}
                />
                <rect
                  x={round2(geo.half + geo.yinWidth)}
                  y={round2(l.y)}
                  width={round2(geo.half)}
                  height={round2(geo.bar)}
                  rx={round2(geo.radius)}
                />
              </>
            )}
            {l.moving && (
              <circle
                className="mark"
                cx={round2(width + width * 0.085)}
                cy={round2(l.y + geo.bar / 2)}
                r={round2(Math.max(width * 0.03, 2.5))}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

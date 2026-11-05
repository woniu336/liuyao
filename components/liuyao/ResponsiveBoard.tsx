'use client';

import React, { useEffect, useRef, useState } from 'react';
import HexagramBoard, { BOARD_BASE_WIDTH, type HexagramBoardProps } from './HexagramBoard';

/**
 * 盘面自适应容器
 * ==============
 * 古籍盘面是一套定宽栅格（六神 32 / 纳甲 68 / 爻画 46 / 世应 18 / 动爻 22 / 变卦 68 / 46 / 52），
 * 合计约 390。手机可用宽度只有 ~350，早先版本直接裁切变卦列。
 *
 * 这里的做法不是重排版式，而是**整体等比缩放**：版式关系与字号相对关系保持原样，
 * 390 是基准，窄屏按容器宽度缩到 0.8 左右，宽屏不放大（避免字太大失古意）。
 */
export default function ResponsiveBoard(props: HexagramBoardProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const innerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const measure = () => {
      const available = wrap.clientWidth;
      const next = Math.min(1, Math.max(0.62, available / BOARD_BASE_WIDTH));
      setScale(next);
      // 缩放后实际占位高度要同步，否则下方会留一大块空白
      const natural = innerRef.current?.offsetHeight ?? 0;
      setHeight(natural ? natural * next : undefined);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="w-full" style={{ height }}>
      <div
        ref={innerRef}
        style={{
          width: BOARD_BASE_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          // 让缩放后的盘面在容器里居中
          marginLeft: `calc(50% - ${(BOARD_BASE_WIDTH * scale) / 2}px)`,
        }}
      >
        <HexagramBoard {...props} />
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';

/**
 * 铜钱：正反两面的真实照片（字面 coin-4 / 背面 coin-3），用 3D 翻转落地。
 *
 * 设计要点：
 *   - 不是"换图"，而是真翻转：正面 0°，背面 180°，`backface-visibility: hidden`；
 *   - 结果由调用方给定（来自 `lib/liuyao/random.ts` 的加密随机），
 *     组件只负责「掷出后停在哪一面」，不参与任何随机；
 *   - 翻滚时长与落定时机统一走 `animationend`，避免"动画没停结果先出"。
 */

export type CoinSide = '字' | '背';

/**
 * 正反面照片。源图只有 85×85，直接放大到 148 设备像素会发虚，
 * 所以预生成 2x（170×170，Lanczos）并用 srcSet 交给浏览器按 DPR 选择。
 *
 * 文件名不要带 `@`：Workers Assets 会把 `@2x` 重写成 `%402x` 再 307 回 `@2x`，
 * 线上就成了无限重定向（本地 dev 看不出来，手机 DPR 3 直接裂图）。用 `-2x` / `-3x`。
 */
const FACE_SRC: Record<CoinSide, { x1: string; x2: string; x3: string }> = {
  字: { x1: '/images/coin-4.png', x2: '/images/coin-4-2x.png', x3: '/images/coin-4-3x.png' },
  背: { x1: '/images/coin-3.png', x2: '/images/coin-3-2x.png', x3: '/images/coin-3-3x.png' },
};

export function Coin({
  side,
  rolling,
  delayMs = 0,
  rotateDeg = 0,
  onSettled,
}: {
  side: CoinSide;
  rolling: boolean;
  delayMs?: number;
  /** 静置时的轻微倾斜，避免三枚"站军姿"般整齐 */
  rotateDeg?: number;
  onSettled?: () => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'settling'>('idle');

  useEffect(() => {
    if (rolling) {
      setPhase('rolling');
      return;
    }
    if (phase === 'rolling') setPhase('settling');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling]);

  const rotation = side === '字' ? 0 : 180;

  return (
    <div
      className="coin-size relative select-none"
      style={{
        perspective: 600,
        transform: rolling ? undefined : `rotate(${rotateDeg}deg)`,
        transition: 'transform 400ms cubic-bezier(0.16,1,0.3,1)',
      }}
      aria-label={`铜钱 ${side}面`}
      role="img"
    >
      {/* 底面：铜钱侧到 90° 时照片会变成一条看不见的边，
          用一圈静态薄环 + 落地阴影表示"它仍在那儿转"，三枚始终可数。 */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '1px solid rgba(31,42,48,0.16)',
          background: 'radial-gradient(circle at 50% 62%, rgba(31,42,48,0.10), rgba(31,42,48,0) 68%)',
        }}
      />
      <div
        className={phase === 'rolling' ? 'coin-spin' : ''}
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          // 落地：滚完直接停在结果那一面；非滚动状态也保持该面
          transform: phase === 'rolling' ? undefined : `rotateY(${rotation}deg)`,
          transition: phase === 'settling' ? 'transform 320ms cubic-bezier(0.16,1,0.3,1)' : undefined,
          animationDelay: phase === 'rolling' ? `${delayMs}ms` : undefined,
        }}
        onAnimationEnd={() => {
          setPhase('settling');
          onSettled?.();
        }}
      >
        {(['字', '背'] as CoinSide[]).map((face) => (
          <img
            key={face}
            src={FACE_SRC[face].x1}
            srcSet={`${FACE_SRC[face].x1} 1x, ${FACE_SRC[face].x2} 2x, ${FACE_SRC[face].x3} 3x`}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backfaceVisibility: 'hidden',
              transform: face === '字' ? 'rotateY(0deg)' : 'rotateY(180deg)',
              // 去掉外发光/重投影：85px 源图经放大后，阴影反而加重"糊"的感觉
              filter: 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}

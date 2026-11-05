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

const FACE_SRC: Record<CoinSide, string> = {
  字: '/images/coin-4.png',
  背: '/images/coin-3.png',
};

export function Coin({
  side,
  rolling,
  size = 64,
  delayMs = 0,
  onSettled,
}: {
  side: CoinSide;
  rolling: boolean;
  size?: number;
  delayMs?: number;
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
      style={{ width: size, height: size, perspective: 600 }}
      className="relative select-none"
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
            src={FACE_SRC[face]}
            alt=""
            draggable={false}
            width={size}
            height={size}
            style={{
              position: 'absolute',
              inset: 0,
              width: size,
              height: size,
              objectFit: 'contain',
              backfaceVisibility: 'hidden',
              transform: face === '字' ? 'rotateY(0deg)' : 'rotateY(180deg)',
              filter: 'drop-shadow(0 3px 6px rgba(31,42,48,0.18))',
            }}
          />
        ))}
      </div>
    </div>
  );
}

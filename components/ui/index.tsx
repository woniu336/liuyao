'use client';

import React from 'react';

/**
 * 设计系统 v2 基础件
 * ==================
 * 采纳的设计意见：
 *   1. 主色（雾霾蓝）只做细线、选中态、次级强调，不做大面积填充；
 *      主按钮改墨色，避免"理财 App"观感。
 *   2. 控件去圆角化（3px），少色块、多描边与文字。
 *   3. 分段控件改下划线式，不再用 iOS 胶囊。
 *   4. 状态标签去胶囊底，用前置符号 + 字色区分。
 *   5. 区块用留白 + 细分隔线，不靠"卡片套卡片"。
 */

type ButtonVariant = 'ink' | 'line' | 'text' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  ink: 'bg-ink-900 text-paper-0 border border-ink-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-ink-800',
  line: 'bg-transparent text-ink-800 border border-line-strong hover:border-ink-600 hover:text-ink-900',
  text: 'bg-transparent text-ink-600 border border-transparent hover:text-ink-900',
  danger: 'bg-transparent text-cinnabar-600 border border-cinnabar-500/50 hover:border-cinnabar-600',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-12 px-6 text-[16px]',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export function Button({
  variant = 'ink',
  size = 'md',
  block,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      style={{ borderRadius: 2 }}
      className={[
        'press tap inline-flex select-none items-center justify-center gap-1.5 font-sans-cn font-medium',
        'tracking-[0.04em] disabled:cursor-not-allowed disabled:opacity-40',
        VARIANT[variant],
        SIZE[size],
        block ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}

/** 版面分区：靠留白与细分隔线，不用描边卡片 */
export function Panel({
  children,
  className = '',
  title,
  hint,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <section className={['py-5', className].filter(Boolean).join(' ')}>
      {(title || hint) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && (
            <h2 className="font-song text-[13.5px] font-semibold tracking-[0.2em] text-ink-900">{title}</h2>
          )}
          {hint && <span className="text-[11px] tracking-[0.04em] text-ink-500">{hint}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

/** 纸面：唯一"像个容器"的东西，仅用于盘面与解卦正文 */
export function Paper({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={['bg-paper-0 px-4 py-4', className].filter(Boolean).join(' ')}
      style={{ borderRadius: 4, border: '1px solid var(--hairline)' }}
    >
      {children}
    </div>
  );
}

/** 状态标签：去胶囊，符号 + 字色 */
export function Tag({
  children,
  tone = 'mist',
  mark = '·',
}: {
  children: React.ReactNode;
  tone?: 'mist' | 'gold' | 'cinnabar' | 'ink';
  mark?: string;
}) {
  const tones = {
    mist: 'text-mist-700',
    gold: 'text-gold-600',
    cinnabar: 'text-cinnabar-600',
    ink: 'text-ink-600',
  } as const;
  return (
    <span className={`inline-flex items-baseline gap-1 text-[11.5px] tracking-[0.04em] ${tones[tone]}`}>
      <span aria-hidden className="opacity-70">
        {mark}
      </span>
      <span className="tabular-nums">{children}</span>
    </span>
  );
}

/** 分段：下划线式，像书页上的标签 */
export function Tabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-end gap-6" role="tablist">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={[
              'press relative pb-2 text-[14.5px] transition-colors',
              active ? 'font-medium text-ink-900' : 'text-ink-500',
            ].join(' ')}
          >
            {o.label}
            <span
              aria-hidden
              className={[
                'absolute inset-x-0 -bottom-px h-px transition-colors opacity-80',
                active ? 'bg-ink-900' : 'bg-transparent',
              ].join(' ')}
            />
          </button>
        );
      })}
    </div>
  );
}

/**
 * 进度点：初爻在下、上爻在上。
 * 阳：实心墨点；阴：空心细环；动：朱砂空心环 + 中点。
 * 刻意做得小而细，避免像"信号格"。
 */
export function ProgressDots({ values }: { values: { yang: boolean; moving?: boolean }[] }) {
  return (
    <div className="flex items-center gap-2">
      {values.map((v, i) => (
        <span
          key={i}
          className="relative inline-flex h-[11px] w-[11px] items-center justify-center"
          aria-label={`第${i + 1}爻 ${v.yang ? '阳' : '阴'}${v.moving ? ' 动' : ''}`}
        >
          <span
            className="absolute inset-0 rounded-full border"
            style={{
              borderColor: v.moving ? 'var(--yao-moving)' : v.yang ? 'var(--yao-yang)' : 'var(--mist-500)',
              borderWidth: 1,
            }}
          />
          {v.yang && !v.moving && (
            <span className="h-[5px] w-[5px] rounded-full" style={{ background: 'var(--yao-yang)' }} />
          )}
          {v.moving && <span className="h-[4px] w-[4px] rounded-full" style={{ background: 'var(--yao-moving)' }} />}
        </span>
      ))}
    </div>
  );
}

/**
 * 爻画：遵循古法盘面——阳一横、阴两段，粗实为常。
 * 动爻改朱砂，但不加圆角、不加阴影。
 */
export function YaoBar({
  yang,
  moving,
  width = 46,
  height = 8,
}: {
  yang: boolean;
  moving?: boolean;
  width?: number;
  height?: number;
}) {
  const color = moving ? 'var(--yao-moving)' : 'var(--yao-yang)';
  if (yang) {
    return <span style={{ width, height, background: color, display: 'block' }} />;
  }
  const seg = Math.floor((width - 8) / 2);
  return (
    <span style={{ display: 'flex', width, height, gap: 8 }}>
      <span style={{ width: seg, height, background: color }} />
      <span style={{ width: seg, height, background: color }} />
    </span>
  );
}

/** 顶部栏：不吸顶太重，滚过即融 */
export function AppBar({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="safe-top sticky top-0 z-20 bg-paper-1/88 backdrop-blur-md">
      <div className="mx-auto flex h-[52px] w-full max-w-[520px] items-center justify-between gap-3 px-5">
        <div className="min-w-0">
          <div className="truncate font-song text-[16.5px] font-semibold tracking-[0.1em] text-ink-900">{title}</div>
          {subtitle && <div className="truncate text-[11px] text-ink-500">{subtitle}</div>}
        </div>
        {right}
      </div>
    </header>
  );
}

export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 bg-paper-1/92 backdrop-blur-md">
      <div className="mx-auto w-full max-w-[520px] px-5 pt-2.5" style={{ borderTop: '1px solid var(--hairline)' }}>
        {children}
      </div>
    </div>
  );
}

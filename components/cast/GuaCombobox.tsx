'use client';

/**
 * 六十四卦下拉选择（可输入）
 * ==========================
 * - 输入即过滤：全名（天风姤）、简称（姤）、宫（乾宫）、上下卦（乾上兑下）都能命中；
 * - 键盘：↑↓ 移动、Enter 选中、Esc 收起；
 * - 选项里带卦画，改起来不靠记名字。
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { guaByBinary, searchGua, type GuaEntry } from '@/lib/liuyao/hexagram-index';

function GuaLines({ binary, tone = 'ink' }: { binary: string; tone?: 'ink' | 'soft' }) {
  const bits = binary.split('').reverse(); // 上爻在顶
  const color = tone === 'ink' ? 'var(--ink-900)' : 'var(--ink-500)';
  return (
    <span className="flex shrink-0 flex-col items-center gap-[2px]" aria-hidden>
      {bits.map((b, i) => (
        <span key={i} className="flex h-[2.5px] w-[22px]" style={{ gap: 2.5 }}>
          {b === '1' ? (
            <span className="h-full w-full" style={{ background: color }} />
          ) : (
            <>
              <span className="h-full flex-1" style={{ background: color }} />
              <span className="h-full flex-1" style={{ background: color }} />
            </>
          )}
        </span>
      ))}
    </span>
  );
}

export default function GuaCombobox({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (binary: string) => void;
  hint?: string;
}) {
  const current = guaByBinary(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const options = useMemo(() => searchGua(query), [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const pick = (g: GuaEntry) => {
    onChange(g.binary);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => Math.min(options.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter') {
      if (open && options[cursor]) {
        e.preventDefault();
        pick(options[cursor]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] tracking-[0.1em] text-ink-500">{label}</span>
        {hint && <span className="text-[10.5px] text-ink-400">{hint}</span>}
      </div>

      <div
        className={`flex h-11 items-center gap-2.5 rounded-xs border bg-paper-0 px-2.5 transition-colors ${
          open ? 'border-gold-500' : 'border-line-strong'
        }`}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {current && <GuaLines binary={current.binary} />}
        <input
          ref={inputRef}
          value={open ? query : (current?.name ?? '')}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={current ? current.name : '输入卦名，如 姤 / 天风姤'}
          className="min-w-0 flex-1 bg-transparent font-song text-[14px] text-ink-900 outline-none placeholder:text-ink-400"
        />
        <span className="shrink-0 font-song text-[11px] text-ink-400">{current ? `${current.palace}宫` : ''}</span>
        <span aria-hidden className="shrink-0 text-[10px] text-ink-400">
          ▾
        </span>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-[248px] overflow-y-auto rounded-xs border border-line-strong bg-paper-0 shadow-[0_8px_24px_rgba(20,28,34,0.14)]">
          {options.length === 0 && (
            <p className="px-3 py-3 text-[12px] text-ink-500">没有匹配的卦名</p>
          )}
          {options.map((g, i) => {
            const active = g.binary === value;
            return (
              <button
                key={g.binary}
                type="button"
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(g)}
                className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors ${
                  i === cursor ? 'bg-paper-1' : 'bg-transparent'
                }`}
              >
                <GuaLines binary={g.binary} tone={active ? 'ink' : 'soft'} />
                <span className={`font-song text-[13.5px] ${active ? 'font-semibold text-ink-900' : 'text-ink-800'}`}>
                  {g.name}
                </span>
                <span className="ml-auto text-[10.5px] text-ink-400">
                  {g.palace}宫 · {g.upper}上{g.lower}下
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

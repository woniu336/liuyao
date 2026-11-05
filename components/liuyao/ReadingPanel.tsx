'use client';

/**
 * 解卦面板（禅意版）
 * ==================
 * - 只在六爻盘面下方出现一个「解 卦」入口，默认不占版面；
 * - 点击后把**盘面事实**发到服务端（密钥只在服务端），流式接收，逐字落下；
 * - 四段口径：取用 / 盘面 / 走势 / 应期（prompt 在 app/api/read/prompt.ts）；
 * - 排版取「纸上批注」：窄栏、宽行距、竖排小标、朱砂光标，不写报告体；
 * - 事实抽屉：可以看见到底发送了什么（不含任何密钥）。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReadingFacts } from '@/lib/readings/types';

type Phase = 'idle' | 'streaming' | 'done' | 'error';

interface Block {
  type: 'h' | 'p';
  text: string;
  /** 标题的序号（一 / 二 / 三…），仅 type === 'h' 时有 */
  numeral?: string;
}

const HEADING_LINE =
  /^(?:[【〔]\s*([一二三四五六七八九十]+)\s*[】〕]|([一二三四五六七八九十]+)\s*[、.．])\s*(.+)$/;

/** 按行解析：短标题行单独成段，其余行合并成段落（处理「标题+正文同一段」） */
function parseBlocks(text: string): Block[] {
  const out: Block[] = [];
  let buf: string[] = [];
  const flush = () => {
    const s = buf.join('').trim();
    if (s) out.push({ type: 'p', text: s });
    buf = [];
  };

  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.replace(/\*\*/g, '').replace(/^#+\s*/, '').trim();
    if (!line) {
      flush();
      continue;
    }
    const m = line.match(HEADING_LINE);
    const numeral = m ? (m[1] ?? m[2]) : null;
    const title = m ? m[3].trim() : '';
    if (numeral && title && title.length <= 18) {
      flush();
      out.push({ type: 'h', text: title, numeral });
      continue;
    }
    buf.push(line);
  }
  flush();
  return out;
}

/**
 * 四段式排版：① 取用 → ② 盘面 → ③ 走势 → ④ 应期
 * 序号入圆标，标题后接一根发丝线，正文窄栏宽行距，不用报告体。
 */
function renderBlocks(text: string) {
  return parseBlocks(text).map((block, i) =>
    block.type === 'h' ? (
      <h3 key={i} data-block="h" className="mb-3 mt-7 flex items-center gap-2.5 first:mt-0">
        <span className="flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full bg-[#3E5148] font-song text-[11.5px] leading-none text-[#F6EFDC]">
          {block.numeral}
        </span>
        <span className="shrink-0 font-song text-[14.5px] font-semibold tracking-[0.14em] text-[#2E3B33] lg:text-[15.5px]">
          {block.text}
        </span>
        <span aria-hidden className="h-px flex-1 bg-[#D9CFB8]" />
      </h3>
    ) : (
      <p
        key={i}
        data-block="p"
        className="mb-4 indent-8 text-justify text-[14.5px] leading-[2.05] tracking-[0.01em] text-[#3B372F] last:mb-0 lg:text-[15.5px] lg:leading-[2.15]"
      >
        {block.text}
      </p>
    ),
  );
}

export interface ReadingPanelHandle {
  start: () => void;
  stop: () => void;
}

export interface ReadingPanelProps {
  /** 六爻盘面事实（kind='liuyao'） */
  facts: ReadingFacts;
  /** 正文增量回调（用于解析用神、底部按钮状态） */
  onTextChange?: (text: string) => void;
  onPhaseChange?: (phase: Phase) => void;
  /** 是否隐藏面板自带的入口按钮（页面底部已有主按钮时用） */
  hideIdleButton?: boolean;
  /** 外层间距（PC 两栏时右侧不需要 mt-7） */
  className?: string;
}

const ReadingPanel = React.forwardRef<ReadingPanelHandle, ReadingPanelProps>(function ReadingPanel(
  { facts, onTextChange, onPhaseChange, hideIdleButton, className = 'mt-7' },
  ref,
) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [showFacts, setShowFacts] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickRef = useRef(true);
  const startedAtRef = useRef(0);

  // 换一卦就重置
  useEffect(() => {
    abortRef.current?.abort();
    setPhase('idle');
    setText('');
    setError('');
    setShowFacts(false);
  }, [facts]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      stickRef.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (phase === 'streaming' && stickRef.current) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
    }
  }, [text, phase]);

  useEffect(() => {
    if (phase !== 'streaming') return;
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    startedAtRef.current = Date.now();
    setElapsed(0);
    setPhase('streaming');
    setText('');
    setError('');
    // 起解即把「解卦位置」带到视野里（移动端底部有固定动作条，留一点上边距）
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const res = await fetch('/api/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facts }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || `解卦服务不可用（${res.status}）`);
      }
      if (!res.body) throw new Error('解卦响应为空');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx = buffer.indexOf('\n\n');
        while (idx >= 0) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          idx = buffer.indexOf('\n\n');

          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            const evt = JSON.parse(payload) as { content?: string; error?: string; done?: boolean };
            if (typeof evt.error === 'string') throw new Error(evt.error);
            if (typeof evt.content === 'string') setText((prev) => prev + evt.content);
            if (evt.done) setPhase('done');
          }
        }
      }
      setPhase((p) => (p === 'streaming' ? 'done' : p));
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setPhase((p) => (p === 'streaming' ? 'done' : p));
        return;
      }
      setError((e as Error).message);
      setPhase('error');
    }
  }, [facts]);

  const stop = () => {
    abortRef.current?.abort();
    setPhase('done');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 忽略 */
    }
  };

  const blocks = useMemo(() => renderBlocks(text), [text]);

  useEffect(() => {
    onTextChange?.(text);
  }, [text, onTextChange]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  React.useImperativeHandle(ref, () => ({ start: () => void run(), stop }), [run]);

  if (phase === 'idle' && hideIdleButton) {
    return null;
  }

  if (phase === 'idle') {
    return (
      <section className={`border-t border-[#E8DFC9] pt-6 ${className}`}>
        <div className="flex flex-col items-center gap-2.5 py-2">
          <button
            type="button"
            onClick={() => void run()}
            className="group inline-flex h-10 items-center justify-center border border-[#C9BCA6] px-9 font-serif text-[12.5px] tracking-[0.45em] text-[#5E5A50] transition-colors hover:border-[#8A8378] hover:text-[#22201B]"
          >
            解 卦
          </button>
          <p className="font-serif text-[10.5px] tracking-[0.08em] text-[#9C907F]">
            以盘面事实为凭 · 不作吉凶承诺
          </p>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className={`scroll-mt-20 ${className}`}>
      <div className="relative mx-auto max-w-[680px]">
        {phase === 'streaming' && !text && (
          <div className="flex flex-col items-center gap-3 py-9">
            <span className="relative flex h-9 w-9 items-center justify-center" aria-hidden>
              <span className="ink-ripple absolute inset-0 rounded-full border border-[#B08A5E]/60" />
              <span className="ink-ripple absolute inset-0 rounded-full border border-[#B08A5E]/40 [animation-delay:900ms]" />
              <span className="ink-drop h-2.5 w-2.5 rounded-full bg-[#8E6337]" />
            </span>
            <p className="font-song text-[12.5px] tracking-[0.22em] text-[#8A7A60]">
              研墨中{elapsed >= 2 ? ` · ${elapsed}s` : ''}
            </p>
            <p className="font-kai text-[11px] tracking-[0.06em] text-[#A79C8A]">
              {elapsed >= 20 ? '正在依盘面事实推演，思考模式首字稍慢' : '依盘面事实起卦辞，请稍候'}
            </p>
          </div>
        )}

        {text && (
          <div aria-live="polite">
            {blocks}
            {phase === 'streaming' && (
              <span className="ml-[2px] inline-block h-[0.95em] w-[1px] translate-y-[0.12em] animate-pulse bg-[#8E3A2C]/60" />
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 space-y-1.5 font-serif text-[12px] leading-relaxed text-[#8e3a2c]">
            <p>{error}</p>
            <p className="text-[11px] text-[#9C907F]">
              若提示未配置，请到 /admin 的「LLM 切换」里选一个已配好密钥的 profile。
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-dashed border-[#E4DCCB] pt-3 font-serif text-[11px] text-[#8C8272]">
          {phase === 'streaming' ? (
            <button type="button" onClick={stop} className="cursor-pointer tracking-[0.2em] hover:text-[#22201B]">
              停 止
            </button>
          ) : phase === 'error' ? (
            <button type="button" onClick={() => void run()} className="cursor-pointer tracking-[0.2em] hover:text-[#22201B]">
              重 试
            </button>
          ) : null}
          {text && (
            <button type="button" onClick={() => void copy()} className="cursor-pointer hover:text-[#22201B]">
              {copied ? '已复制' : '复制'}
            </button>
          )}
          <button type="button" onClick={() => setShowFacts((v) => !v)} className="cursor-pointer hover:text-[#22201B]">
            所呈事实
          </button>
        </div>

        {/* 事实抽屉：隐藏展开，能看见到底发送了什么（不含任何密钥） */}
        {showFacts && (
          <pre className="mt-3 max-h-[260px] overflow-auto whitespace-pre-wrap border border-[#E4DCCB] bg-[#FBF8F1] p-3 font-mono text-[10.5px] leading-relaxed text-[#7C7365]">
            {JSON.stringify(facts, null, 2)}
          </pre>
        )}

        <p className="mt-4 text-center font-serif text-[10px] tracking-[0.08em] text-[#A79C8A]">
          只发送上列盘面事实 · 密钥不出服务端
        </p>
      </div>
    </section>
  );
});

export default ReadingPanel;

'use client';

/**
 * 卦例夹：本地保存的卦例列表。
 *
 * 现在读的是 localStorage（lib/store 的本地实现）；换成 D1 后这个组件不用改，
 * 因为 getCaseStore() 返回的接口本来就是异步的。
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Trash2 } from 'lucide-react';
import { getCaseStore } from '@/lib/store';
import { caseTimeLabel } from '@/lib/cases/record';
import type { CaseRecord } from '@/lib/store/types';

const KIND_LABEL: Record<CaseRecord['kind'], string> = { liuyao: '六爻', xct: '小成图' };

export default function CasesView() {
  const [items, setItems] = useState<CaseRecord[] | null>(null);
  const [mode, setMode] = useState<'local' | 'remote'>('local');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const store = await getCaseStore();
      setMode(store.mode ?? 'local');
      setItems(await store.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFavorite = async (record: CaseRecord) => {
    const store = await getCaseStore();
    await store.setFavorite(record.id, !record.favorite);
    await load();
  };

  const remove = async (record: CaseRecord) => {
    if (!window.confirm(`删除这条卦例？\n\n${record.summary.primary}${record.summary.changed ? ` → ${record.summary.changed}` : ''}`)) {
      return;
    }
    const store = await getCaseStore();
    await store.remove(record.id);
    await load();
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-3 pb-24 pt-6 font-serif sm:px-5 sm:pt-9">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="inline-block h-[5px] w-[5px] rounded-full bg-[#8E3A2C]" />
          <h1 className="text-[19px] font-semibold tracking-[0.16em] text-[#22201b] sm:text-[21px]">卦例夹</h1>
        </div>
        <Link href="/" className="shrink-0 text-[11.5px] text-[#5e5a50] underline-offset-4 hover:text-[#8e3a2c] hover:underline">
          返回首页
        </Link>
      </header>

      <p className="mb-4 pl-[18px] text-[11.5px] leading-relaxed text-[#7c7365]">
        只保存起卦输入（时间 / 投掷 / 起卦法），打开时由引擎重新排出同一卦。
        {mode === 'remote'
          ? '已保存到云端（按本机匿名声明的设备 ID 归属）：换浏览器或清除 Cookie 会得到新的卦例夹。'
          : '当前保存在本机浏览器；完整云端存储请用 npm run dev:vinext 或线上环境。'}
      </p>

      {error && (
        <div className="mb-3 rounded-[3px] border border-[#d9a99f] bg-[#fdf2ef] px-3 py-2 text-[11.5px] text-[#8e3a2c]">
          {error}
        </div>
      )}

      {items === null && <p className="py-10 text-center text-[12px] text-[#8c8272]">读取中…</p>}

      {items && items.length === 0 && (
        <div className="rounded-md border border-[#E0D8C9] bg-[#FFFDF8] px-5 py-12 text-center">
          <p className="text-[13px] text-[#5e5a50]">还没有保存的卦例。</p>
          <p className="mt-2 text-[11.5px] text-[#8c8272]">
            起一卦后，在盘面右上角点「保存卦例」即可收藏到这里。
          </p>
          <div className="mt-4 flex items-center justify-center gap-3 text-[12px]">
            <Link href="/liuyao" className="rounded-[2px] border border-[#CBBFA8] px-3 py-1.5 text-[#5e5a50] hover:border-[#8a8378] hover:text-[#22201b]">
              去起六爻
            </Link>
            <Link href="/xct" className="rounded-[2px] border border-[#CBBFA8] px-3 py-1.5 text-[#5e5a50] hover:border-[#8a8378] hover:text-[#22201b]">
              去起小成图
            </Link>
          </div>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-2.5">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-[4px] border border-[#E0D8C9] bg-[#FFFDF8] px-4 py-3 shadow-[0_1px_4px_rgba(23,20,15,0.03)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="rounded-[2px] bg-[#F1EFE4] px-1.5 py-[1px] text-[10px] tracking-[0.08em] text-[#8e3a2c]">
                      {KIND_LABEL[r.kind]}
                    </span>
                    <span className="text-[15px] font-semibold tracking-wide text-[#22201b]">{r.summary.primary}</span>
                    {r.summary.changed && (
                      <>
                        <span className="text-[11px] text-[#8c8272]">→</span>
                        <span className="text-[14px] text-[#22201b]">{r.summary.changed}</span>
                      </>
                    )}
                    {(r.summary.tags ?? []).slice(0, 5).map((t) => (
                      <span key={t} className="rounded-[2px] border border-[#d9cdb6] px-1 py-[1px] text-[10px] text-[#8c8272]">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#7c7365]">
                    <span className="tabular-nums">{caseTimeLabel(r)}</span>
                    {r.question?.trim() && <span className="min-w-0 truncate">「{r.question.trim()}」</span>}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void toggleFavorite(r)}
                    aria-label={r.favorite ? '取消收藏' : '收藏'}
                    title={r.favorite ? '取消收藏' : '收藏'}
                    className={`cursor-pointer rounded-[3px] border p-1.5 transition-colors ${
                      r.favorite
                        ? 'border-[#cfa79b] bg-[#fdf2ef] text-[#8e3a2c]'
                        : 'border-[#E0D8C9] text-[#b0a695] hover:border-[#cbbfa8] hover:text-[#8e3a2c]'
                    }`}
                  >
                    <Star size={13} fill={r.favorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(r)}
                    aria-label="删除卦例"
                    title="删除"
                    className="cursor-pointer rounded-[3px] border border-[#E0D8C9] p-1.5 text-[#b0a695] transition-colors hover:border-[#cfa79b] hover:text-[#8e3a2c]"
                  >
                    <Trash2 size={13} />
                  </button>
                  <Link
                    href={`/${r.kind === 'liuyao' ? 'liuyao' : 'xct'}?case=${r.id}`}
                    className="ml-1 rounded-[2px] border border-[#CBBFA8] px-2.5 py-1.5 text-[11.5px] text-[#5e5a50] transition-colors hover:border-[#8a8378] hover:text-[#22201b]"
                  >
                    打开
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

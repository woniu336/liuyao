'use client';

/**
 * 设置 · 大模型
 * ==============
 * 全站只有这一处设置：解卦用的大模型。
 * 只存**本机浏览器** localStorage（`liuyao.llm.v1`），不上传、不入库；
 * 每次解卦时随请求发给本站 `/api/read`，服务端只做一次转发。
 *
 * 通用性：按「OpenAI 兼容 /chat/completions」做，预置常见供应商，也能自己填任意网关。
 */

import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import {
  LLM_PROVIDERS,
  clearLlmSettings,
  findProvider,
  isLlmConfigured,
  llmRequestPayload,
  loadLlmSettings,
  saveLlmSettings,
  validateLlmSettings,
  type LlmSettings,
} from '@/lib/llm/settings';

const EMPTY: LlmSettings = { provider: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-flash', apiKey: '', thinking: 'disabled' };

const FIELD =
  'h-10 w-full rounded-[3px] border border-[#D9CDB6] bg-white px-2.5 font-mono text-[12.5px] text-[#2F4438] outline-none transition-colors focus:border-[#9A7040]';

export default function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState<LlmSettings>(EMPTY);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(loadLlmSettings() ?? EMPTY);
    setError('');
    setNotice('');
    setSaved(isLlmConfigured(loadLlmSettings()));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const preset = findProvider(draft.provider);

  const pickProvider = (id: string) => {
    const p = findProvider(id);
    setDraft((d) => ({
      ...d,
      provider: id,
      baseUrl: p?.baseUrl ?? '',
      model: p?.models[0] ?? '',
      thinking: id === 'deepseek' ? d.thinking : undefined,
    }));
    setNotice('');
    setError('');
  };

  const onSave = () => {
    const msg = validateLlmSettings(draft);
    if (msg) {
      setError(msg);
      return;
    }
    saveLlmSettings(draft);
    setError('');
    setSaved(true);
    setNotice('已保存到本机浏览器');
  };

  const onClear = () => {
    clearLlmSettings();
    setDraft(EMPTY);
    setSaved(false);
    setNotice('已清除本机保存的设置');
    setError('');
  };

  const onTest = async () => {
    const msg = validateLlmSettings(draft);
    if (msg) {
      setError(msg);
      return;
    }
    setTesting(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/llm-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(llmRequestPayload(draft)),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; sample?: string };
      if (json.ok) setNotice(`连接正常${json.sample ? `：${json.sample}` : ''}`);
      else setError(json.error || '连接失败');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/35 px-3 backdrop-blur-[2px] sm:px-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="设置"
    >
      <div
        className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto border border-[#CDBB96] bg-[#FCF8EF] px-5 pb-5 pt-4 shadow-[0_18px_50px_rgba(53,45,31,0.22)]"
        style={{ borderRadius: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <p className="font-kai text-[10.5px] tracking-[0.18em] text-[#9A805A]">设置</p>
            <h2 className="mt-1 font-song text-[19px] font-semibold tracking-[0.1em] text-[#2F4438]">大模型解读</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭设置"
            className="press flex h-8 w-8 items-center justify-center rounded-full text-[#8C8272] hover:bg-[#F1EBDE] hover:text-[#2F4438]"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <p className="mb-4 font-song text-[11.5px] leading-[1.9] text-[#7C7668]">
          解卦需要一个大模型。填好后<strong className="font-semibold text-[#3F4A42]">只保存在本机浏览器</strong>
          （localStorage），不上传服务器、不入库；每次解卦时随请求转发一次。
          支持任意「OpenAI 兼容」接口，换供应商只要改这里。
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block font-song text-[12px] text-[#665F52]">供应商</label>
            <select
              value={draft.provider}
              onChange={(e) => pickProvider(e.target.value)}
              className="h-10 w-full rounded-[3px] border border-[#D9CDB6] bg-white px-2.5 font-song text-[13px] text-[#2F4438] outline-none focus:border-[#9A7040]"
            >
              {LLM_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {preset?.hint && <p className="mt-1 font-song text-[10.5px] text-[#A79C8A]">{preset.hint}</p>}
          </div>

          <div>
            <label className="mb-1 block font-song text-[12px] text-[#665F52]">
              接口地址 <span className="text-[#A79C8A]">（Base URL，填到 /v1 为止）</span>
            </label>
            <input
              value={draft.baseUrl}
              onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
              placeholder="https://api.deepseek.com/v1"
              spellCheck={false}
              className={FIELD}
            />
          </div>

          <div>
            <label className="mb-1 block font-song text-[12px] text-[#665F52]">模型</label>
            <input
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              placeholder="deepseek-flash"
              spellCheck={false}
              list="llm-models"
              className={FIELD}
            />
            <datalist id="llm-models">
              {(preset?.models ?? []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="mb-1 block font-song text-[12px] text-[#665F52]">API Key</label>
            <div className="flex items-center gap-1.5">
              <input
                type={showKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                placeholder={preset && !preset.needsKey ? '本地模型可留空' : 'sk-...'}
                spellCheck={false}
                autoComplete="off"
                className={FIELD}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? '隐藏密钥' : '显示密钥'}
                className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] border border-[#D9CDB6] text-[#7C7668] hover:text-[#2F4438]"
              >
                {showKey ? <EyeOff size={15} strokeWidth={1.7} /> : <Eye size={15} strokeWidth={1.7} />}
              </button>
            </div>
          </div>

          {draft.provider === 'deepseek' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-song text-[12px] text-[#665F52]">思考模式</label>
                <select
                  value={draft.thinking ?? 'default'}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      thinking: e.target.value === 'default' ? undefined : (e.target.value as 'enabled' | 'disabled'),
                    })
                  }
                  className="h-10 w-full rounded-[3px] border border-[#D9CDB6] bg-white px-2.5 font-song text-[12.5px] text-[#2F4438] outline-none focus:border-[#9A7040]"
                >
                  <option value="default">默认</option>
                  <option value="enabled">开启</option>
                  <option value="disabled">关闭</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-song text-[12px] text-[#665F52]">思考强度</label>
                <select
                  value={draft.reasoningEffort ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      reasoningEffort: e.target.value ? (e.target.value as 'low' | 'high' | 'max') : undefined,
                    })
                  }
                  className="h-10 w-full rounded-[3px] border border-[#D9CDB6] bg-white px-2.5 font-song text-[12.5px] text-[#2F4438] outline-none focus:border-[#9A7040]"
                >
                  <option value="">不指定</option>
                  <option value="low">low</option>
                  <option value="high">high</option>
                  <option value="max">max</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-3 font-song text-[11.5px] leading-relaxed text-[#8E3A2C]">{error}</p>}
        {notice && !error && <p className="mt-3 font-song text-[11.5px] text-[#3F6B55]">{notice}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            className="press inline-flex h-10 flex-1 items-center justify-center rounded-[3px] border border-[#D8C392]/50 bg-[linear-gradient(180deg,#456557_0%,#29453B_100%)] px-4 font-song text-[13.5px] tracking-[0.14em] text-[#F5E9CB] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
          >
            保存到本机
          </button>
          <button
            type="button"
            onClick={() => void onTest()}
            disabled={testing}
            className="press inline-flex h-10 items-center justify-center rounded-[3px] border border-[#C3B79E] bg-[#FBF7EC] px-3.5 font-song text-[12.5px] text-[#3F4A42] disabled:opacity-60"
          >
            {testing ? '测试中…' : '测试连接'}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="press inline-flex h-10 items-center justify-center rounded-[3px] px-2.5 font-song text-[12px] text-[#8C8272] hover:text-[#8E3A2C]"
          >
            清除
          </button>
        </div>

        <p className="mt-3 font-song text-[10.5px] leading-relaxed text-[#A79C8A]">
          {saved ? '当前已保存配置：解卦可直接使用。' : '尚未保存：解卦前需要先在这里填好。'}
          　密钥不会写入服务器数据库，也不会出现在任何日志里。
        </p>
      </div>
    </div>
  );
}

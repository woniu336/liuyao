'use client';

/**
 * 后台（M1 骨架）：登录 + 公告 + LLM 切换 + 统计配置 + 审计。
 *
 * 这一版刻意保持「工具感」：功能先跑通、边界先立住，
 * 公告的站内展示与统计脚本注入在 M3 接前台。
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  AdminState,
  AnalyticsProvider,
  AnnouncementLevel,
  LlmProfile,
  ReasoningEffort,
  ThinkingMode,
} from '@/lib/admin/types';

type Tab = 'announcement' | 'llm' | 'analytics' | 'audit';

const TABS: { id: Tab; label: string }[] = [
  { id: 'announcement', label: '公告' },
  { id: 'llm', label: 'LLM 切换' },
  { id: 'analytics', label: '流量统计' },
  { id: 'audit', label: '审计' },
];

const LEVELS: { value: AnnouncementLevel; label: string }[] = [
  { value: 'info', label: '提示' },
  { value: 'warn', label: '注意' },
  { value: 'danger', label: '重要' },
];

const PROVIDERS: { value: AnalyticsProvider; label: string }[] = [
  { value: 'none', label: '不启用' },
  { value: 'cloudflare', label: 'Cloudflare Web Analytics' },
  { value: 'umami', label: 'Umami（自建）' },
  { value: 'plausible', label: 'Plausible' },
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json?.error || `请求失败（${res.status}）`);
  return json;
}

function toLocalInput(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminView() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [devFallback, setDevFallback] = useState(false);
  const [password, setPassword] = useState('');
  const [state, setState] = useState<AdminState | null>(null);
  const [tab, setTab] = useState<Tab>('announcement');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const flash = (msg: string) => {
    setNotice(msg);
    setError('');
    window.setTimeout(() => setNotice(''), 2500);
  };

  const loadState = useCallback(async () => {
    const data = await api<{ state: AdminState }>('/api/admin/state');
    setState(data.state);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const s = await api<{ authenticated: boolean; configured: boolean; devFallback: boolean }>(
          '/api/admin/session',
        );
        setConfigured(s.configured);
        setDevFallback(s.devFallback);
        setAuthenticated(s.authenticated);
        if (s.authenticated) await loadState();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setChecking(false);
      }
    })();
  }, [loadState]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      setPassword('');
      setAuthenticated(true);
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setAuthenticated(false);
    setState(null);
  };

  if (checking) {
    return <Centered>正在检查登录状态…</Centered>;
  }

  if (!authenticated) {
    return (
      <Centered>
        <form onSubmit={login} className="w-full max-w-[340px] space-y-3">
          <div className="text-center">
            <h1 className="font-serif text-[22px] font-semibold tracking-[0.2em] text-[#22201b]">后 台</h1>
            <p className="mt-1 font-serif text-[11px] text-[#8c8272]">公告 · LLM 切换 · 流量统计</p>
          </div>

          {!configured && (
            <div className="rounded-[3px] border border-[#d9a99f] bg-[#fdf2ef] px-3 py-2 text-[11.5px] leading-relaxed text-[#8e3a2c]">
              后台未配置：请设置服务端环境变量 <code>ADMIN_PASSWORD</code> 与{' '}
              <code>ADMIN_SESSION_SECRET</code>。
            </div>
          )}
          {devFallback && (
            <div className="rounded-[3px] border border-[#d9cdb6] bg-[#faf5e9] px-3 py-2 text-[11.5px] leading-relaxed text-[#7c6a45]">
              本地开发默认口令：<code className="font-mono">dev-admin</code>
              （仅 NODE_ENV=development 时生效，生产环境不会启用）
            </div>
          )}

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="管理员口令"
            autoComplete="current-password"
            className="h-11 w-full rounded-[3px] border border-[#D9CDB6] bg-white px-3 font-serif text-[14px] text-[#22201b] outline-none focus:border-[#8e3a2c]"
          />
          <button
            type="submit"
            disabled={busy || !password}
            className="h-11 w-full cursor-pointer rounded-[3px] bg-[#8e3a2c] font-serif text-[13px] tracking-[0.2em] text-[#fffdf8] transition-colors hover:bg-[#7a3125] disabled:cursor-not-allowed disabled:bg-[#cbbfa8]"
          >
            {busy ? '登录中…' : '登 录'}
          </button>
          {error && <p className="text-center text-[11.5px] text-[#8e3a2c]">{error}</p>}
          <p className="text-center font-serif text-[11px]">
            <Link href="/" className="text-[#5e5a50] underline-offset-4 hover:text-[#8e3a2c] hover:underline">
              返回首页
            </Link>
          </p>
        </form>
      </Centered>
    );
  }

  if (!state) {
    return <Centered>正在读取后台数据…</Centered>;
  }

  return (
    <div className="mx-auto w-full max-w-[980px] px-3 pb-24 pt-6 sm:px-5 sm:pt-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h1 className="font-serif text-[19px] font-semibold tracking-[0.16em] text-[#22201b]">后台</h1>
          <span
            className={`rounded-[2px] px-1.5 py-[1px] text-[10px] ${
              state.mode === 'd1' ? 'bg-[#eef4ea] text-[#3f5b4b]' : 'bg-[#faf0e3] text-[#8a5a2b]'
            }`}
            title={state.mode === 'd1' ? 'Cloudflare D1 / 本地 miniflare' : 'next dev 无绑定，数据仅存进程内'}
          >
            {state.mode === 'd1' ? 'D1' : '内存模式'}
          </span>
          {state.auth.devFallback && (
            <span className="rounded-[2px] bg-[#faf5e9] px-1.5 py-[1px] text-[10px] text-[#7c6a45]">开发口令</span>
          )}
        </div>
        <div className="flex items-center gap-3 font-serif text-[11.5px] text-[#5e5a50]">
          <Link href="/" className="underline-offset-4 hover:text-[#8e3a2c] hover:underline">
            前台
          </Link>
          <button type="button" onClick={() => void logout()} className="cursor-pointer underline-offset-4 hover:text-[#8e3a2c] hover:underline">
            退出
          </button>
        </div>
      </header>

      {state.mode === 'memory' && (
        <div className="mb-3 rounded-[3px] border border-[#e0cdb2] bg-[#fbf6ec] px-3 py-2 font-serif text-[11.5px] leading-relaxed text-[#7c6a45]">
          当前是内存模式（next dev 没有 Workers 绑定），数据重启即清空。完整验证请运行
          <code className="mx-1 font-mono">npm run dev:vinext</code>（本地 D1）。
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-[#E4DCCB] pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`cursor-pointer rounded-[3px] px-3 py-1.5 font-serif text-[12px] transition-colors ${
              tab === t.id ? 'bg-[#22201b] text-[#faf7f0]' : 'text-[#5e5a50] hover:bg-[#f1ece1] hover:text-[#22201b]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(notice || error) && (
        <div
          className={`mb-3 rounded-[3px] border px-3 py-2 font-serif text-[11.5px] ${
            error ? 'border-[#d9a99f] bg-[#fdf2ef] text-[#8e3a2c]' : 'border-[#c8d6c6] bg-[#f2f7f0] text-[#3f5b4b]'
          }`}
        >
          {error || notice}
        </div>
      )}

      {tab === 'announcement' && (
        <AnnouncementPanel state={state} onSaved={loadState} setBusy={setBusy} setError={setError} flash={flash} />
      )}
      {tab === 'llm' && <LlmPanel state={state} onSaved={loadState} setError={setError} flash={flash} />}
      {tab === 'analytics' && (
        <AnalyticsPanel state={state} onSaved={loadState} setError={setError} flash={flash} />
      )}
      {tab === 'audit' && <AuditPanel state={state} onRefresh={loadState} setError={setError} />}
      {busy && <p className="mt-2 text-center font-serif text-[11px] text-[#8c8272]">处理中…</p>}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-[420px] text-center font-serif text-[12px] text-[#8c8272]">{children}</div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[4px] border border-[#E0D8C9] bg-[#FFFDF8] p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-[13.5px] font-semibold text-[#22201b]">{title}</h2>
        {hint && <span className="font-serif text-[11px] text-[#8c8272]">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

const inputCls =
  'h-9 w-full rounded-[3px] border border-[#D9CDB6] bg-white px-2.5 font-serif text-[12.5px] text-[#22201b] outline-none focus:border-[#8e3a2c]';
const labelCls = 'block font-serif text-[11px] text-[#7c7365] mb-1';

function AnnouncementPanel({
  state,
  onSaved,
  setError,
  flash,
}: {
  state: AdminState;
  onSaved: () => Promise<void>;
  setBusy: (b: boolean) => void;
  setError: (s: string) => void;
  flash: (s: string) => void;
}) {
  const [enabled, setEnabled] = useState(state.announcement.enabled);
  const [level, setLevel] = useState<AnnouncementLevel>(state.announcement.level);
  const [text, setText] = useState(state.announcement.text);
  const [startsAt, setStartsAt] = useState(toLocalInput(state.announcement.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(state.announcement.endsAt));

  useEffect(() => {
    setEnabled(state.announcement.enabled);
    setLevel(state.announcement.level);
    setText(state.announcement.text);
    setStartsAt(toLocalInput(state.announcement.startsAt));
    setEndsAt(toLocalInput(state.announcement.endsAt));
  }, [state.announcement]);

  const save = async () => {
    setError('');
    try {
      await api('/api/admin/announcement', {
        method: 'PUT',
        body: JSON.stringify({ enabled, level, text, startsAt: startsAt || null, endsAt: endsAt || null }),
      });
      await onSaved();
      flash('公告已保存');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-4">
      <Section title="公告设置" hint="公开接口 /api/announcement · 缓存 60s · 前台展示在 M3 接入">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 font-serif text-[12px] text-[#22201b]">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            启用公告
          </label>
          <div>
            <span className={labelCls}>级别</span>
            <select value={level} onChange={(e) => setLevel(e.target.value as AnnouncementLevel)} className={inputCls}>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <span className={labelCls}>正文（最多 2000 字）</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full rounded-[3px] border border-[#D9CDB6] bg-white px-2.5 py-2 font-serif text-[12.5px] leading-relaxed text-[#22201b] outline-none focus:border-[#8e3a2c]"
            />
          </div>
          <div>
            <span className={labelCls}>开始时间（可选）</span>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputCls} />
          </div>
          <div>
            <span className={labelCls}>结束时间（可选）</span>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void save()}
            className="cursor-pointer rounded-[3px] bg-[#8e3a2c] px-4 py-2 font-serif text-[12px] text-[#fffdf8] hover:bg-[#7a3125]"
          >
            保存公告
          </button>
          <a
            href="/api/announcement"
            target="_blank"
            rel="noreferrer"
            className="font-serif text-[11.5px] text-[#5e5a50] underline-offset-4 hover:text-[#8e3a2c] hover:underline"
          >
            查看公开接口
          </a>
        </div>
      </Section>

      <Section title="预览">
        <div
          className={`rounded-[3px] border px-3 py-2 font-serif text-[12px] ${
            level === 'danger'
              ? 'border-[#d9a99f] bg-[#fdf2ef] text-[#8e3a2c]'
              : level === 'warn'
                ? 'border-[#e0cdb2] bg-[#fbf6ec] text-[#7c6a45]'
                : 'border-[#c8d6c6] bg-[#f2f7f0] text-[#3f5b4b]'
          }`}
        >
          {text.trim() || '（公告正文为空）'}
        </div>
      </Section>
    </div>
  );
}

const emptyProfile = (): Pick<
  LlmProfile,
  'id' | 'label' | 'baseUrl' | 'model' | 'keyEnv' | 'thinking' | 'reasoningEffort' | 'enabled' | 'sort'
> => ({
  id: '',
  label: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-flash',
  keyEnv: 'LLM_API_KEY',
  thinking: 'default',
  enabled: true,
  sort: 0,
});

function LlmPanel({
  state,
  onSaved,
  setError,
  flash,
}: {
  state: AdminState;
  onSaved: () => Promise<void>;
  setError: (s: string) => void;
  flash: (s: string) => void;
}) {
  const [form, setForm] = useState(emptyProfile());
  const [testResult, setTestResult] = useState('');
  const [busy, setBusy] = useState(false);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const post = async (body: unknown) => {
    setBusy(true);
    setError('');
    try {
      const res = await api<Record<string, unknown>>('/api/admin/llm', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await onSaved();
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const res = await post({ action: 'upsert', profile: form });
    if (res) {
      flash('已保存');
      setForm(emptyProfile());
    }
  };

  const activate = async (id: string) => {
    if (await post({ action: 'activate', id })) flash('已切换当前 LLM');
  };

  const remove = async (id: string) => {
    if (!window.confirm('删除这个 LLM profile？')) return;
    if (await post({ action: 'delete', id })) flash('已删除');
  };

  const test = async () => {
    setTestResult('测试中…');
    const res = await post({
      action: 'test',
      profile: {
        baseUrl: form.baseUrl,
        model: form.model,
        keyEnv: form.keyEnv,
        thinking: form.thinking,
        reasoningEffort: form.reasoningEffort,
      },
    });
    if (res) {
      setTestResult(
        res.ok
          ? `✓ 连通（${String(res.ms)}ms）：${String(res.sample ?? '').slice(0, 80)}`
          : `✗ ${String(res.error ?? res.sample ?? '失败')}`,
      );
    } else {
      setTestResult('');
    }
  };

  return (
    <div className="space-y-4">
      <Section title="当前生效" hint="密钥只在服务端环境变量里；这里只填变量名">
        {state.activeProfileId ? (
          (() => {
            const p = state.profiles.find((x) => x.id === state.activeProfileId);
            return p ? (
              <p className="font-serif text-[12.5px] text-[#22201b]">
                {p.label} · <code className="font-mono text-[11.5px]">{p.model}</code> · 密钥变量{' '}
                <code className="font-mono text-[11.5px]">{p.keyEnv}</code>
              </p>
            ) : (
              <p className="text-[12px] text-[#8e3a2c]">当前指向的 profile 已不存在，请重新选择。</p>
            );
          })()
        ) : (
          <p className="font-serif text-[12px] text-[#8c8272]">
            未配置 profile：解卦会退回环境变量 LLM_API_KEY 兜底。
          </p>
        )}
      </Section>

      <Section title="已配置的 LLM" hint={`${state.profiles.length} 个`}>
        {state.profiles.length === 0 ? (
          <p className="font-serif text-[12px] text-[#8c8272]">还没有 profile，用下面的表单添加。</p>
        ) : (
          <ul className="space-y-2">
            {state.profiles.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[3px] border border-[#EFE7D8] px-3 py-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-serif text-[13px] font-semibold text-[#22201b]">{p.label}</span>
                    {state.activeProfileId === p.id && (
                      <span className="rounded-[2px] bg-[#eef4ea] px-1.5 py-[1px] text-[10px] text-[#3f5b4b]">当前</span>
                    )}
                    {!p.enabled && <span className="rounded-[2px] bg-[#f1ece1] px-1.5 py-[1px] text-[10px] text-[#7c7365]">停用</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10.5px] text-[#7c7365]">
                    <span>{p.model}</span>
                    <span>{p.baseUrl}</span>
                    <span>key: {p.keyEnv}</span>
                    <span>
                      思考:{p.thinking === 'enabled' ? '开' : p.thinking === 'disabled' ? '关' : '默认'}
                      {p.reasoningEffort ? `·${p.reasoningEffort}` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 font-serif text-[11.5px]">
                  <button
                    type="button"
                    disabled={busy || !p.enabled || state.activeProfileId === p.id}
                    onClick={() => void activate(p.id)}
                    className="cursor-pointer rounded-[2px] border border-[#CBBFA8] px-2 py-1 text-[#5e5a50] hover:border-[#8a8378] hover:text-[#22201b] disabled:cursor-default disabled:opacity-40"
                  >
                    设为当前
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...p })}
                    className="cursor-pointer rounded-[2px] border border-[#CBBFA8] px-2 py-1 text-[#5e5a50] hover:border-[#8a8378] hover:text-[#22201b]"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(p.id)}
                    className="cursor-pointer rounded-[2px] border border-[#d9a99f] px-2 py-1 text-[#8e3a2c] hover:bg-[#fdf2ef]"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={form.id ? `编辑：${form.id}` : '新增 profile'}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className={labelCls}>名称</span>
            <input value={form.label} onChange={(e) => update('label', e.target.value)} className={inputCls} placeholder="DeepSeek 官方" />
          </div>
          <div>
            <span className={labelCls}>模型</span>
            <input value={form.model} onChange={(e) => update('model', e.target.value)} className={inputCls} placeholder="deepseek-chat" />
          </div>
          <div>
            <span className={labelCls}>Base URL（https）</span>
            <input value={form.baseUrl} onChange={(e) => update('baseUrl', e.target.value)} className={inputCls} />
          </div>
          <div>
            <span className={labelCls}>密钥环境变量名</span>
            <input value={form.keyEnv} onChange={(e) => update('keyEnv', e.target.value)} className={inputCls} placeholder="LLM_API_KEY" />
          </div>
          <div>
            <span className={labelCls}>排序（小的在前）</span>
            <input type="number" value={form.sort} onChange={(e) => update('sort', Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <span className={labelCls}>思考模式</span>
            <select
              value={form.thinking ?? 'default'}
              onChange={(e) => update('thinking', e.target.value as ThinkingMode)}
              className={inputCls}
            >
              <option value="default">默认（由模型决定）</option>
              <option value="enabled">开启</option>
              <option value="disabled">关闭</option>
            </select>
          </div>
          <div>
            <span className={labelCls}>思考强度</span>
            <select
              value={form.reasoningEffort ?? ''}
              onChange={(e) =>
                update('reasoningEffort', (e.target.value || undefined) as ReasoningEffort | undefined)
              }
              className={inputCls}
            >
              <option value="">不指定</option>
              <option value="low">low</option>
              <option value="high">high</option>
              <option value="max">max</option>
            </select>
          </div>
          <label className="mt-5 flex items-center gap-2 font-serif text-[12px] text-[#22201b]">
            <input type="checkbox" checked={form.enabled} onChange={(e) => update('enabled', e.target.checked)} />
            启用
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || !form.label || !form.model || !form.baseUrl || !form.keyEnv}
            onClick={() => void save()}
            className="cursor-pointer rounded-[3px] bg-[#8e3a2c] px-4 py-2 font-serif text-[12px] text-[#fffdf8] hover:bg-[#7a3125] disabled:cursor-not-allowed disabled:bg-[#cbbfa8]"
          >
            {form.id ? '保存修改' : '添加'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void test()}
            className="cursor-pointer rounded-[3px] border border-[#CBBFA8] px-3 py-2 font-serif text-[12px] text-[#5e5a50] hover:border-[#8a8378] hover:text-[#22201b]"
          >
            测试连通
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyProfile())}
              className="cursor-pointer font-serif text-[11.5px] text-[#5e5a50] underline-offset-4 hover:text-[#8e3a2c] hover:underline"
            >
              取消编辑
            </button>
          )}
        </div>
        {testResult && <p className="mt-2 font-mono text-[11px] text-[#5e5a50]">{testResult}</p>}
      </Section>
    </div>
  );
}

function AnalyticsPanel({
  state,
  onSaved,
  setError,
  flash,
}: {
  state: AdminState;
  onSaved: () => Promise<void>;
  setError: (s: string) => void;
  flash: (s: string) => void;
}) {
  const [enabled, setEnabled] = useState(state.analytics.enabled);
  const [provider, setProvider] = useState<AnalyticsProvider>(state.analytics.provider);
  const [token, setToken] = useState(state.analytics.token ?? '');
  const [siteId, setSiteId] = useState(state.analytics.siteId ?? '');
  const [scriptUrl, setScriptUrl] = useState(state.analytics.scriptUrl ?? '');

  useEffect(() => {
    setEnabled(state.analytics.enabled);
    setProvider(state.analytics.provider);
    setToken(state.analytics.token ?? '');
    setSiteId(state.analytics.siteId ?? '');
    setScriptUrl(state.analytics.scriptUrl ?? '');
  }, [state.analytics]);

  const save = async () => {
    setError('');
    try {
      await api('/api/admin/analytics', {
        method: 'PUT',
        body: JSON.stringify({ enabled, provider, token, siteId, scriptUrl }),
      });
      await onSaved();
      flash('统计配置已保存');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-4">
      <Section title="统计配置" hint="脚本注入在前台接入时生效（M3）">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 font-serif text-[12px] text-[#22201b]">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            启用统计
          </label>
          <div>
            <span className={labelCls}>服务商</span>
            <select value={provider} onChange={(e) => setProvider(e.target.value as AnalyticsProvider)} className={inputCls}>
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {provider === 'cloudflare' && (
            <div className="sm:col-span-2">
              <span className={labelCls}>Cloudflare Web Analytics token</span>
              <input value={token} onChange={(e) => setToken(e.target.value)} className={inputCls} placeholder="beacon token" />
            </div>
          )}
          {(provider === 'umami' || provider === 'plausible') && (
            <>
              <div>
                <span className={labelCls}>siteId</span>
                <input value={siteId} onChange={(e) => setSiteId(e.target.value)} className={inputCls} />
              </div>
              <div>
                <span className={labelCls}>脚本地址（https，可空）</span>
                <input value={scriptUrl} onChange={(e) => setScriptUrl(e.target.value)} className={inputCls} placeholder="https://umami.example.com/script.js" />
              </div>
            </>
          )}
        </div>
        <p className="mt-3 font-serif text-[11px] leading-relaxed text-[#8c8272]">
          只接受结构化配置（不用任意 JS snippet），避免把后台变成 XSS 入口。
          需要自定义脚本时再单独加白名单开关。
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void save()}
            className="cursor-pointer rounded-[3px] bg-[#8e3a2c] px-4 py-2 font-serif text-[12px] text-[#fffdf8] hover:bg-[#7a3125]"
          >
            保存配置
          </button>
        </div>
      </Section>
    </div>
  );
}

function AuditPanel({
  state,
  onRefresh,
  setError,
}: {
  state: AdminState;
  onRefresh: () => Promise<void>;
  setError: (s: string) => void;
}) {
  const refresh = async () => {
    try {
      await onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Section title="审计" hint="最近 50 条">
      <div className="mb-3">
        <button
          type="button"
          onClick={() => void refresh()}
          className="cursor-pointer rounded-[2px] border border-[#CBBFA8] px-2.5 py-1 font-serif text-[11.5px] text-[#5e5a50] hover:border-[#8a8378] hover:text-[#22201b]"
        >
          刷新
        </button>
      </div>
      {state.audit.length === 0 ? (
        <p className="font-serif text-[12px] text-[#8c8272]">暂无记录。</p>
      ) : (
        <ul className="divide-y divide-[#F0E9DB]">
          {state.audit.map((a) => (
            <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-1.5 font-mono text-[10.5px] text-[#7c7365]">
              <span className="tabular-nums">{a.at.replace('T', ' ').slice(0, 19)}</span>
              <span className="text-[#22201b]">{a.action}</span>
              <span>{a.actor}</span>
              {a.detail && <span className="min-w-0 flex-1 truncate">{a.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

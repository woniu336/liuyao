import { getAdminStore } from '@/lib/admin/store';
import { requireAdmin, sameOrigin } from '@/lib/admin/server/auth';
import { adminError, adminJson, readJsonBody } from '@/lib/admin/server/http';
import { parseProfile } from '@/lib/admin/server/validate';
import { SETTING_LLM_ACTIVE, type LlmProfile } from '@/lib/admin/types';
import { buildChatRequestBody } from '@/lib/readings/llm-request';

/**
 * LLM 配置管理（受保护）。
 *
 * 只存 profile（provider 元信息 + 密钥所在的环境变量名），密钥本身永远不进库。
 */
export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return adminJson({ error: guard.error }, guard.status);
  if (!sameOrigin(req)) return adminJson({ error: '跨源请求被拒绝' }, 403);

  try {
    const body = (await readJsonBody(req)) as Record<string, unknown>;
    const action = String(body.action ?? '');
    const { store } = await getAdminStore();
    const profiles = await store.listProfiles();
    const active = await store.getSetting<string>(SETTING_LLM_ACTIVE);

    if (action === 'upsert') {
      const profile = parseProfile(body.profile);
      await store.upsertProfile(profile, guard.actor);
      // 第一个 profile 自动设为当前
      if (!active) await store.setSetting(SETTING_LLM_ACTIVE, profile.id, guard.actor);
      return adminJson({ ok: true, profile });
    }

    if (action === 'delete') {
      const id = String(body.id ?? '');
      if (!id) return adminJson({ error: '缺少 id' }, 400);
      await store.deleteProfile(id, guard.actor);
      if (active === id) await store.setSetting(SETTING_LLM_ACTIVE, null, guard.actor);
      return adminJson({ ok: true });
    }

    if (action === 'activate') {
      const id = String(body.id ?? '');
      const target = profiles.find((p) => p.id === id);
      if (!target) return adminJson({ error: 'profile 不存在' }, 404);
      if (!target.enabled) return adminJson({ error: '该 profile 已停用' }, 400);
      await store.setSetting(SETTING_LLM_ACTIVE, id, guard.actor);
      return adminJson({ ok: true, activeProfileId: id });
    }

    if (action === 'test') {
      let target: Pick<LlmProfile, 'baseUrl' | 'model' | 'keyEnv'> | undefined;
      if (typeof body.id === 'string' && body.id) {
        const found = profiles.find((p) => p.id === body.id);
        if (!found) return adminJson({ error: 'profile 不存在' }, 404);
        target = found;
      } else if (body.profile && typeof body.profile === 'object') {
        target = body.profile as Pick<LlmProfile, 'baseUrl' | 'model' | 'keyEnv'>;
      }
      if (!target?.baseUrl || !target?.model || !target?.keyEnv) {
        return adminJson({ error: '测试需要 baseUrl / model / keyEnv' }, 400);
      }
      // 测试接口也走同样的出站约束，避免变成 SSRF 探针
      if (!/^https:\/\//.test(target.baseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(target.baseUrl)) {
        return adminJson({ error: 'Base URL 必须是 https（本机调试可用 http://localhost）' }, 400);
      }
      if (!/^[A-Z][A-Z0-9_]*$/.test(target.keyEnv)) {
        return adminJson({ error: '密钥变量名不合法' }, 400);
      }
      const key = typeof process !== 'undefined' ? process.env[target.keyEnv] : undefined;
      if (!key) {
        return adminJson({ error: `环境变量 ${target.keyEnv} 未设置（密钥只在服务端）` }, 400);
      }

      const started = Date.now();
      try {
        const upstream = await fetch(`${target.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify(
            buildChatRequestBody({
              model: target.model,
              stream: false,
              temperature: 0,
              maxTokens: 256,
              thinking: (target as LlmProfile).thinking,
              reasoningEffort: (target as LlmProfile).reasoningEffort,
              messages: [{ role: 'user', content: 'ping' }],
            }),
          ),
          signal: AbortSignal.timeout(15_000),
        });
        const text = await upstream.text();
        let sample = text.slice(0, 160);
        try {
          const json = JSON.parse(text);
          sample = json?.choices?.[0]?.message?.content ?? json?.error?.message ?? sample;
        } catch {
          /* 保留原文片段 */
        }
        return adminJson({
          ok: upstream.ok,
          status: upstream.status,
          ms: Date.now() - started,
          sample: String(sample).slice(0, 200),
        });
      } catch (e) {
        return adminJson({ ok: false, error: (e as Error).message, ms: Date.now() - started });
      }
    }

    return adminJson({ error: `未知 action：${action}` }, 400);
  } catch (e) {
    return adminError(e);
  }
}

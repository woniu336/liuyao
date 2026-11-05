import { afterEach, describe, expect, it } from 'vitest';
import {
  adminAuthConfig,
  createSessionToken,
  verifyPassword,
  verifySessionToken,
} from '../lib/admin/server/auth';

const saved: Record<string, string | undefined> = { ...process.env };
const setEnv = (key: string, value: string) => {
  (process.env as Record<string, string | undefined>)[key] = value;
};
const delEnv = (key: string) => {
  delete (process.env as Record<string, string | undefined>)[key];
};
afterEach(() => {
  const current = process.env as Record<string, string | undefined>;
  for (const key of Object.keys(current)) {
    if (!(key in saved)) delete current[key];
  }
  Object.assign(current, saved);
});

describe('后台鉴权', () => {
  it('口令常量时间比较', async () => {
    expect(await verifyPassword('dev-admin', 'dev-admin')).toBe(true);
    expect(await verifyPassword('dev-admiN', 'dev-admin')).toBe(false);
    expect(await verifyPassword('', 'dev-admin')).toBe(false);
  });

  it('会话令牌可签可验；篡改/过期一律失败', async () => {
    const token = await createSessionToken('secret-x', 3600);
    expect(await verifySessionToken(token, 'secret-x')).toBe(true);

    // 篡改签名
    const [exp, sig] = token.split('.');
    const tampered = `${exp}.${sig.slice(0, -2)}AA`;
    expect(await verifySessionToken(tampered, 'secret-x')).toBe(false);

    // 换密钥
    expect(await verifySessionToken(token, 'secret-y')).toBe(false);

    // 过期
    const expired = await createSessionToken('secret-x', -10);
    expect(await verifySessionToken(expired, 'secret-x')).toBe(false);

    // 结构不合法
    expect(await verifySessionToken('garbage', 'secret-x')).toBe(false);
    expect(await verifySessionToken('', 'secret-x')).toBe(false);
  });

  it('生产环境缺少 env 时 fail-closed；开发环境给内置口令', () => {
    delEnv('ADMIN_PASSWORD');
    delEnv('ADMIN_SESSION_SECRET');

    setEnv('NODE_ENV', 'production');
    const prod = adminAuthConfig();
    expect(prod.configured).toBe(false);
    expect(prod.devFallback).toBe(false);

    setEnv('NODE_ENV', 'development');
    const dev = adminAuthConfig();
    expect(dev.configured).toBe(true);
    expect(dev.devFallback).toBe(true);
    expect(dev.password).toBe('dev-admin');

    setEnv('ADMIN_PASSWORD', 'p');
    setEnv('ADMIN_SESSION_SECRET', 's');
    const explicit = adminAuthConfig();
    expect(explicit.configured).toBe(true);
    expect(explicit.devFallback).toBe(false);
  });

  it('内置口令只在自身域名下启用：外部 Host 一律不启用', () => {
    delEnv('ADMIN_PASSWORD');
    delEnv('ADMIN_SESSION_SECRET');
    setEnv('NODE_ENV', 'development');

    const remote = adminAuthConfig(new Request('https://liuyao.example.com/admin'));
    expect(remote.configured).toBe(false);
    expect(remote.devFallback).toBe(false);

    const local = adminAuthConfig(new Request('http://localhost:3000/admin'));
    expect(local.configured).toBe(true);
    expect(local.devFallback).toBe(true);
  });

  it('只配一半（有口令没密钥）视为未配置', () => {
    delEnv('ADMIN_PASSWORD');
    delEnv('ADMIN_SESSION_SECRET');
    setEnv('NODE_ENV', 'production');
    setEnv('ADMIN_PASSWORD', 'only-password');
    const cfg = adminAuthConfig();
    expect(cfg.configured).toBe(false);
  });
});

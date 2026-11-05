/**
 * 运行时绑定访问（仅服务端）。
 *
 * Next(dev/Node) 里没有 Workers 绑定；vinext/workerd 里通过 `cloudflare:workers` 取。
 * 这里用**变量说明符**做动态 import：打包器不会静态解析，Node 下抛错被吞掉，
 * Workers 下正常返回 env。这样同一份代码在两个运行时都不炸。
 */
export interface RuntimeEnv {
  DB?: unknown;
  [key: string]: unknown;
}

export async function getRuntimeEnv(): Promise<RuntimeEnv | null> {
  try {
    const specifier = 'cloudflare:workers';
    const mod = (await import(/* webpackIgnore: true */ /* @vite-ignore */ specifier)) as {
      env?: RuntimeEnv;
    };
    return mod?.env ?? null;
  } catch {
    return null;
  }
}

import { bindings, defineConfig, defineWorker } from "cf/config";

// 本地开发：把 shell 里给出的变量映射成文本绑定，nodejs_compat 会再映射到 process.env。
// 生产环境用 cf/wrangler 的 secret 注入，不经过这里。
// 自有域名：部署时用环境变量指定，例如
//   WORKER_DOMAIN=liuyao.example.com WORKER_ZONE=example.com npx cf deploy
// 不设就只挂 *.workers.dev（首次部署时 cf 会问一次子域名）。
// 上游白名单：默认收紧到常用供应商（想加自建网关就改这一行，或用 LLM_ALLOWED_HOSTS 覆盖）
const LLM_ALLOWED_DEFAULT =
  "opencode.ai,deepseek.com,api.openai.com,api.moonshot.cn,open.bigmodel.cn,dashscope.aliyuncs.com,openrouter.ai,api.siliconflow.cn";

const workerDomain = process.env.WORKER_DOMAIN;

const devText = (name: string) => {
  const value = typeof process !== "undefined" ? process.env[name] : undefined;
  return value ? bindings.text(value) : undefined;
};

export default defineConfig({
  worker: defineWorker({
    name: "liuyao",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-05",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    // 自有域名用 Custom Domain：会自动建 DNS 记录与证书（triggers.fetch 的路由不会自动建 DNS）
    ...(workerDomain ? { domains: [workerDomain] } : {}),
    env: {
      ASSETS: bindings.assets(),
      DB: bindings.d1({ name: "liuyao-db" }),
      ADMIN_PASSWORD: devText("ADMIN_PASSWORD"),
      ADMIN_SESSION_SECRET: devText("ADMIN_SESSION_SECRET"),
      LLM_API_KEY: devText("LLM_API_KEY"),
      LLM_ALLOWED_HOSTS: devText("LLM_ALLOWED_HOSTS") ?? bindings.text(LLM_ALLOWED_DEFAULT),
      LLM_BASE_URL: devText("LLM_BASE_URL"),
      LLM_MODEL: devText("LLM_MODEL"),
    },
  }),
});

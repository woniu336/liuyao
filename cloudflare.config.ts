import { bindings, defineConfig, defineWorker } from "cf/config";

// 本地开发：把 shell 里给出的变量映射成文本绑定，nodejs_compat 会再映射到 process.env。
// 生产环境用 cf/wrangler 的 secret 注入，不经过这里。
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
    env: {
      ASSETS: bindings.assets(),
      DB: bindings.d1({ name: "liuyao-db" }),
      ADMIN_PASSWORD: devText("ADMIN_PASSWORD"),
      ADMIN_SESSION_SECRET: devText("ADMIN_SESSION_SECRET"),
      LLM_API_KEY: devText("LLM_API_KEY"),
      LLM_BASE_URL: devText("LLM_BASE_URL"),
      LLM_MODEL: devText("LLM_MODEL"),
    },
  }),
});

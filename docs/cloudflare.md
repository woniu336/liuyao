# Cloudflare 部署备忘

目标：Cloudflare Workers（vinext / workerd），**暂不部署**，先把约束钉住。

## 运行形态

| 部分 | 位置 | 说明 |
| --- | --- | --- |
| `/`、`/liuyao`、`/cases`、`/classics` | 静态预渲染 | 排盘引擎全在客户端，纯函数 |
| `/api/read` | Worker | 解卦 SSE 代理（prompt 服务端拼装） |
| `/api/llm-test` | Worker | 大模型连通性测试（一次性转发） |
| `/api/cases` | Worker | 卦例读写（D1，按匿名设备 Cookie 隔离） |

## 状态

- **D1**：只有 `cases` 一张表（`migrations/0001_init.sql`）。
  `npm run gen:schema` 生成运行时建表常量，`npm run check:schema` 校验一致性。
- **后台已下线**：没有 `/admin`、没有 `settings` / `llm_profiles` / `admin_audit`。
  大模型配置改由用户自带，只存在用户浏览器的 `localStorage['liuyao.llm.v1']`，
  每次解卦随请求体发到 `/api/read`，服务端只做一次转发，不落库、不写日志。
- 旧库如果还留着那三张表，不影响运行（代码不再读写）；想清干净可在 D1 控制台 DROP。

## 大模型链路

```
浏览器（localStorage 里的 baseUrl/model/key）
   └─ POST /api/read { facts, llm }        ← 服务端校验：协议、模型名、拦内网地址
        └─ POST {baseUrl}/chat/completions  ← 原样转发，key 只在内存里活一次
             └─ SSE 回传 → 四段正文
```

- 任何「OpenAI 兼容」供应商都能用（DeepSeek / OpenAI / Moonshot / 智谱 / 通义 /
  OpenRouter / SiliconFlow / Ollama / 自建网关）。
- 自建部署可用服务端 env 兜底：`LLM_API_KEY`（可选 `LLM_BASE_URL`、`LLM_MODEL`、
  `LLM_THINKING`、`LLM_REASONING_EFFORT`）；请求体里带了 `llm` 就以请求体为准。
- 限流是模块级内存表，只在单实例内生效；真要上线建议换 Cloudflare Rate Limiting 或 D1 计数。

## 可移植性红线

`npm run check:portability` 会扫运行时代码，禁止：

- `node:*` / `fs` / `path` 等 Node 内置模块（Worker 里没有）；
- `next/image`、`next/font`、`output: 'export'`；
- 任何在起卦路径上用 `Math.random` 的地方（见 `tests/random.test.ts`）。

## 命令

```bash
npm run check              # schema + portability + 测试
npm run dev:vinext         # workerd + 本地 D1（http://localhost:3001）
npm run build && npm run build:vinext
```

## 部署（自有域名，不上架应用商店）

```bash
npx cf auth login                                  # 设备码授权
cf d1 create --name liuyao-db                      # 可选，deploy 也会自动 provision
WORKER_DOMAIN=liuyao.example.com WORKER_ZONE=example.com npx cf deploy
```

- `WORKER_DOMAIN` / `WORKER_ZONE` 写在 `cloudflare.config.ts` 的 `triggers.fetch` 里；
  不设就只挂 `*.workers.dev`。域名必须已在同一个 Cloudflare 账号下托管（DNS 在 CF）。
- 部署产物：60 个静态资源 + Worker，**1.5MB / gzip 486KB**；绑定只有 `DB`(D1) 与 `ASSETS`，
  不需要任何 secret（大模型 key 在用户浏览器里）。
- D1 表结构在首次请求时惰性建（`ensureD1Schema`），无需手工跑迁移。
- 上线后建议：给 `/api/read` 加 Cloudflare Rate Limiting 规则（内存限流只在单实例生效）；
  若担心被当免费代理，可把上游限制在供应商白名单。

## 移动端

不上架商店，走 **PWA**：

- `app/manifest.ts` → `/manifest.webmanifest`（standalone、暖纸主题色、案例/历史排盘快捷方式）
- 图标：`public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png`（由 `app/icon.svg` 渲染）
- `public/sw.js`：导航 network-first 回落离线壳；`/_next/static`、`/icons`、`/images`、`/fonts`、`/data`
  cache-first + 后台更新；`/api/*` 一律直连不缓存
- `components/site/ServiceWorkerRegister.tsx`：只在**非本机域名**注册（localhost / *.local 自动注销）
- 效果：加到主屏后全屏无地址栏，**起卦与排盘离线可用**；解卦与历史同步需要联网。

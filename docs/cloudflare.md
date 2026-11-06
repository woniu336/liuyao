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

## 部署前要做的事

1. Node ≥ 26.12；`npx cf auth login`。
2. 建 D1 库并绑定 `DB`；跑一次 `migrations/*.sql`。
3. 本地验证：`npm run dev:vinext`（workerd + 本地 D1）走完「起卦 → 排盘 → 设置模型 → 解卦 →
   历史回看」。
4. `npm run build:vinext` 通过；`npm run check` 全绿。
5. 真部署前再确认：是否要开自定义域名、是否要给 `/api/read` 加边缘限流。

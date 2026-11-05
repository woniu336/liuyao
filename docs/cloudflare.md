# Cloudflare 目标与约束（暂不部署）

当前阶段：**先把产品做对，不部署**。但所有新代码都按 Cloudflare Workers 的能力写，
避免上线前才发现「这段在 Workers 上跑不了」。

验证命令：

```bash
npm run check:portability   # 运行时代码是否有 fs/node 内置、next/image、next/font、锁死静态导出
```

## 一、现在的形态

| 路由 | 形态 | 说明 |
|---|---|---|
| `/`、`/liuyao`、`/xct`、`/cases` | 静态预渲染 | 引擎全在客户端，纯函数 |
| `/api/read` | 动态（服务端） | 解卦流式代理；只收盘面事实，key 只在服务端 |

- 运行时没有 `fs` / `node:*`；唯一例外 `lib/dev/dev-origins.ts` 只被 `next.config.ts`（构建期）引用。
- 字体是本地 CSS，没有 `next/font`；图片是普通 `<img>`，没有 `next/image`。
- 不把 `next.config.ts` 设成 `output: 'export'`：那会把 route handler 的门焊死。

## 二、已定的产品方向（2026-11）

1. **A**：排盘/盘面持续优化，纯前端。
2. **B**：存卦例/历史/收藏。存储通过 `lib/store` 的异步接口访问，本地实现是 localStorage，
   将来换 D1 只改实现。记录只存「起卦输入」，盘面由引擎重算。
3. **C**：解卦。客户端只发 `lib/readings/types.ts` 里的事实对象；prompt 在服务端
   （`app/api/read/prompt.ts`）拼；key 只在服务端环境变量/secret。
4. **后台**：公告、LLM 切换、流量统计配置（进行中，见下）。

## 三、后台（规划中）的 Cloudflare 形态

- **存储**：D1（`admin_settings` / `llm_profiles` / `admin_audit`）。
  - 公告 = 一行 JSON；LLM = profile 行（`base_url` / `model` / **`key_env`**，密钥本身永远不进库）。
  - 本地开发先走文件/内存实现（`AdminStore` 接口），D1 适配器在 vinext/wrangler 本地环境跑通后接入。
- **鉴权**：先单管理员口令（HttpOnly + HMAC 签名 Cookie，WebCrypto 实现，Workers 可用）；
  绑定自有域名后切 Cloudflare Access（Zero Trust），把 `/admin*` 与 `/api/admin/*` 交给边缘保护。
- **公告下发**：`GET /api/announcement`（D1 读 + 短缓存），布局里客户端组件渲染；
  接口不可用时静默不显示，不影响排盘。
- **统计**：优先「结构化配置」而不是任意 JS —— Cloudflare Web Analytics token / 第三方 siteId；
  若要支持自定义 snippet，必须单独开关并标注 XSS 风险。
- **密钥**：`wrangler secret put LLM_API_KEY`（或 `DEEPSEEK_API_KEY` 等）。
  后台只切 profile，不显示、不落库密钥。

## 四、部署触发条件（满足任意一条再动）

1. 需要跨设备/多人看到同一份公告、同一套 LLM 配置；
2. 卦例要跨设备同步（D1）；
3. 要给内测用户一个公网地址。

## 五、真要部署时的时间账（已实测）

- 纯静态上线：约 1 小时（`output: 'export'` + Workers 静态资源 + 域名）。
- 带服务端：`vinext check` 对当前代码 94% 兼容、0 issue；
  `vinext init --platform=cloudflare` 为非破坏性改造，`next dev` 可继续作为主开发流。
  OpenNext 目前要求 `next >=15.5.29 <16 || >=16.4.5`，我们用 16.3.0，若走 OpenNext 需先升 Next。
- Cloudflare 官方已把新项目的 Next 方案改为 **vinext**（OpenNext 降为存量维护）；
  vinext 自身仍标注 "under active development"，所以只在要加服务端能力时才引入，并做 `--preview` 验证。

## 六、国内可达性

`*.workers.dev` 在国内常被阻断或很慢。真正上线应绑定自有域名（Cloudflare 代理），
并用手机流量实测；文档里「国内访问也很流畅」的说法不可作为依据。

## 七、M0 框架验证结果（2026-11-05，分支 `spike/vinext`）

环境：Windows 11 · Node v26.4.0 · npm 11.17 · Next 16.3.0 · React 19.3.1 · vite 8.3.0 · vinext 1.4.3

已验证：

| 项目 | 结果 |
|---|---|
| `vinext init --platform=cloudflare --cdn-cache=none --data-cache=none --image-optimization=none` | 生成 `vite.config.ts` + `cloudflare.config.ts`，React 升 19.3.1 |
| `vite dev`（workerd） | `/` `/liuyao` `/xct` `/cases` 全 200；六爻起卦→排盘→保存→打开、小成图起盘→点宫全部正常，0 console error |
| 本地 D1 | `bindings.d1({name})` + `cloudflare:workers` 的 `env.DB` 可建表/写入/查询，跨请求持久（`.cloudflare/state/v3/d1/*.sqlite`） |
| WebCrypto | HMAC-SHA256 签名/验签、`crypto.randomUUID` 可用 |
| `/api/read` | 指向本地 mock 上游时 SSE 逐字下发 + done 事件正常（workerd 内 fetch 流式 OK） |
| `vite build` / `vite preview` | 构建 3.5s；生产包页面 200、客户端 hydration 正常、D1 与 SSE 均正常 |
| 产物体积 | `.cloudflare/output` 8.2 MB（worker bundle ≈300 KB + assets），远低于 Workers 限制 |
| 既有回路回归 | `next dev` / `next build` 在 `type: module` + React 19.3.1 下仍正常；`tsc --noEmit` 通过；22 项测试通过；`check:portability` 通过 |

需要注意（M1 前要解决/确认）：

1. **`.dev.vars` 没有映射进 workerd 的 `process.env`**；反而是 `bindings.text()` 文本绑定会被 nodejs_compat 映射到 `process.env`。
   真实 secret（`cf` 的 secret）注入后 `process.env` 是否可见，需要在拿到账号后实测，再定 `getSecret()` 的写法（必要时改成 `cloudflare:workers` 的 `env`）。
2. `vinext dev` 会打印 `eval() is not supported... React dev mode`——React 开发期警告，生产无影响。
3. `vinext:optimize-imports` 对 `lucide-react` 部分图标跳过 barrel 优化（非报错）。
4. 某依赖声明 Node `^26.12.0`（当前 26.4.0 可用但不在声明区间）；建议升 Node 26.12+ 或 24.x LTS。
5. `vinext init` 在 npm 11 + 用户级 `allow-scripts=workerd` 下会报 `EALLOWSCRIPTS`；本次用 `--userconfig` 绕过。
   正式接入时把 `allowScripts` 收进项目配置，别依赖本机 npmrc。
6. **未做**：`vinext-cloudflare deploy`（wrangler/cf 未登录）、Cloudflare Access、真实 secret 注入。

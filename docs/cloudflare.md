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

## 八、M1：后台地基（已完成）

### 数据（D1）

`migrations/0001_init.sql`（单一事实源）→ `lib/admin/store/schema.generated.ts`（运行时内联建表语句，
由 `npm run gen:schema` 生成，`npm run check:schema` 校验一致性；`npm run check` 会一起跑）。

| 表 | 用途 |
|---|---|
| `settings` | `announcement` / `analytics` / `llm_active_id` 等键值（JSON） |
| `llm_profiles` | provider 元信息：`base_url` / `model` / **`key_env`**（密钥变量名，永不存密钥） |
| `cases` | 卦例（留给 M3 迁移前台，当前前台仍用 localStorage） |
| `admin_audit` | 所有写操作的审计（actor / action / detail） |

### 接口

| 路径 | 鉴权 | 说明 |
|---|---|---|
| `GET /api/announcement` | 公开 | 生效中的公告（60s 缓存，失败返回 null） |
| `GET /api/admin/session` | 公开 | 登录态 / 是否已配置 / 当前存储模式 |
| `POST /api/admin/login` | 口令 | 限流 5 次/5 分钟；成功写 HttpOnly 签名 Cookie |
| `POST /api/admin/logout` | 会话 | 清 Cookie + 审计 |
| `GET /api/admin/state` | 会话 | 后台快照（公告/统计/LLM/审计） |
| `PUT /api/admin/announcement` | 会话 + 同源 | 校验后写库 + 审计 |
| `PUT /api/admin/analytics` | 会话 + 同源 | 结构化统计配置（不接任意 JS） |
| `POST /api/admin/llm` | 会话 + 同源 | `upsert` / `delete` / `activate` / `test` |
| `GET /api/admin/audit` | 会话 | 审计列表（≤200） |

### 鉴权

- 口令：`ADMIN_PASSWORD`；会话签名：`ADMIN_SESSION_SECRET`（WebCrypto HMAC-SHA256，7 天）。
- 两者缺一 → 后台 503（fail-closed）。
- **开发默认口令 `dev-admin` 只在「本机 hostname（localhost/127.0.0.1）+ 非 production」时启用**；
  线上域名不会走兜底，避免忘配 env 时悄悄开门。
- 登录限流是进程内内存表（单 isolate 有效）；上线时换 Cloudflare Rate Limiting / D1 计数。
- 绑定域名后接 Cloudflare Access：边缘保护 `/admin*` 与 `/api/admin/*`，应用内识别
  `Cf-Access-Jwt-Assertion` 即可，口令分支保留兜底。

### LLM 切换

- 后台维护 profile：`label / baseUrl / model / keyEnv / enabled / sort`，选定 `llm_active_id`。
- `/api/read` 优先用 active profile，并从 `process.env[keyEnv]` 取密钥；后台「测试连通」会真的打一次上游。
- 没配 profile 时退回 `LLM_API_KEY / DEEPSEEK_API_KEY / OPENAI_API_KEY` 兜底。
- 密钥不显示、不落库；加新 provider 只需部署侧加一个 secret。

### 本地怎么跑

```bash
# 有 D1 的完整回路（推荐验收后台）
npm run dev:vinext        # http://localhost:3001/admin，开发默认口令 dev-admin
# 或显式给口令：
ADMIN_PASSWORD=xxx ADMIN_SESSION_SECRET=yyy npm run dev:vinext

# 日常 UI 回路（无绑定，后台是内存模式，重启清空，界面有明确提示）
npm run dev               # http://localhost:3000/admin
```

`vite.config.ts` 已放行本机所有非回环 IPv4（`lanOrigins()`），手机可用局域网 IP 访问 dev。

### 验证记录（2026-11-05）

- 39 项测试通过（新增：鉴权 5、存储/校验 9、schema 3）。
- workerd + 本地 D1 端到端：登录 → 公告保存 → `/api/announcement` 生效 → 新建 profile →
  自动/手动设为当前 → `/api/read` 用该 profile 打上游（mock SSE）→ 审计出现 → 退出后 401；
  跨源 PUT 返回 403。
- `npm run build:vinext` 与 `npm run build`（Next）均通过；`check:schema` / `check:portability` 通过。

### 仍未做（M2/M3）

- 公告条与统计脚本的前台注入（M3）。
- 卦例从 localStorage 迁 D1（M3，需要 owner 标识）。
- Cloudflare Access、真实 secret 注入方式、`vinext-cloudflare deploy`。
- 登录限流的边缘化（Rate Limiting / KV）。

## 九、M3（一）：前台公告条与统计注入（已完成）

页面保持静态，配置在客户端拉取：

- `GET /api/site-config`：公告（生效中才返回）+ 统计公开字段；`s-maxage=60`，失败返回空配置。
- `components/site/AnnouncementBar.tsx`：全站顶部条（info/warn/danger 三档），
  「关闭」按 `updatedAt` 记在 localStorage——同一条不再打扰，后台更新后重新出现。
- `components/site/AnalyticsInjector.tsx`：按结构化配置运行时插入 `<script>`，带
  `data-liuyao-analytics` 标记防重复；只认白名单 provider 与 https 地址，缺字段一律不注入。
- `lib/site/site-config.ts`：纯函数（`publicSiteConfig` / `analyticsScript`），已覆盖单测。

验证（workerd + 本地 D1）：

1. 后台启用公告 → 前台刷新出现；点关闭 → 刷新仍隐藏；后台再次保存（updatedAt 变化）→ 重新出现。
2. 统计切 Cloudflare + token → 页面注入 `beacon.min.js` 且 `data-cf-beacon={"token":"..."}`；
   关闭统计 → 刷新不再注入。
3. 全程 0 console error；`npm run check`（48 测试）与两套 build 通过。

注意：
- 配置最多 60s 生效（接口缓存）；后台改完想立刻看，可刷新两次或等一分钟。
- 公告/统计都是「失败静默」：接口挂了只影响它们自己，排盘照常。
- 统计 token 本身就是公开信息（会出现在页面源码里），不是密钥。

## 十、卦例上云（M3 第二部分，已完成）

### 归属：匿名设备 ID

- 首次访问 `/api/cases` 时下发 `ly_device`：HttpOnly + SameSite=Lax + 1 年 + Secure(https)。
- 服务端以它作为 `owner_id`，所有查询/写入都带 owner 条件，客户端**不传 owner**。
- 边界（如实告知）：同一浏览器（Cookie）才有同一批卦例；换设备/换浏览器/清 Cookie 会得到新卦例夹。
  以后接账号体系时只换 `ownerId` 来源，`CaseStore` 与 UI 不动。

### 双模式与迁移

客户端 `getCaseStore()` 先探活 `GET /api/cases?probe=1`：

| 返回 | 客户端行为 |
|---|---|
| `mode: d1` | 远端 `RemoteCaseStore`（服务端 D1） |
| `mode: memory`（next dev 无绑定） | 本地 localStorage（避免"重启就丢"的错觉） |
| 接口不可用 | 本地 localStorage |

切到远端时会把 localStorage 里的旧卦例**一次性导入**（`POST {cases:[...]}`，按 id 幂等），
成功后写 `liuyao.cases.migrated.v1`；失败则下次再试。

### 接口

| 路径 | 说明 |
|---|---|
| `GET /api/cases?probe=1` | 探测模式（d1/memory），并下发/复用设备 Cookie |
| `GET /api/cases` | 本人卦例列表（≤200，created_at 倒序） |
| `GET /api/cases?id=` | 单条（非本人返回 404） |
| `POST /api/cases` | `{record}` 单条写入 / `{cases:[...]}` 批量导入（≤200） |
| `PATCH /api/cases` | `{id, favorite}` 收藏 |
| `DELETE /api/cases?id=` | 删除 |

约束：请求体 ≤512KB；写入限流 60 次/分钟（进程内）；同源校验；每 owner 仅保留最近 200 条
（超出在写入时自动裁剪）；服务端 `parseCaseRecord` 做 fail-closed 校验（长度/枚举/投掷值/
类型一致性），多余字段一律丢弃。

### 验证（workerd + 本地 D1）

- 保存 → `/cases` 显示（提示"已保存到云端"）→ 打开复原 → 收藏 → 删除，全程 0 console error。
- 新浏览器上下文（无 Cookie）看不到别人的卦例（owner 隔离）。
- localStorage 旧卦例：首次 `/cases` 自动批量迁移，标记置 1，之后不再重复。
- 58 项测试通过（新增校验 6、远端存储 4）；两套 build 与 `check` 通过。

上线前还要补的滥用防护：现在的限流是单 isolate 内存表，且设备 Cookie 可被清除后重领。
正式上线建议叠加 Cloudflare Rate Limiting / Turnstile，或给 `ly_device` 加签名防止无限新建 owner。

## 十一、解卦 UI 与 prompt 精简（已完成）

### Prompt 怎么砍的

原始提示词 8.2 KB，要求模型自己排盘、写 13 段报告、带病占专项与自检清单。
现在盘面由引擎确定性排出，模型只负责「据实解读」，因此：

| 处理 | 内容 | 原因 |
|---|---|---|
| 移除 | 排盘规范、六神起法、旬空起法、输入核对 | 引擎已经排好；再让模型排会重复且易错 |
| 移除 | 病占专项整段 | 产品是通用占问；只保留一句「涉及健康先提醒就医」 |
| 移除 | 13 段输出格式、自检清单、复盘要求 | 报告体与啰嗦自检；改为四段禅意写法 |
| 合并 | 取象权重 / 或然性 / 师传存疑等多条 | 压成「主干是用神月日动变，象不得越级」 |
| 移除 | 缺日干/缺动爻的假设条款 | 事实永远齐全，不需要假设 |
| 保留 | 取用、月日、动变、世应、六神神煞、辞象合参 | 断卦主干 |
| 保留 | 不断死 / 不断人价值 / 不把或然当必然 | 边界 |
| 保留 | 应期给区间与条件、不精确到时辰 | 不误导 |
| 新增 | 「不重排盘、不改写事实、不补神煞与爻辞」 | 这条最关键 |
| 新增 | 输出四段、500–800 字、克制写法 | 与禅意 UI 匹配 |

系统提示从 ~5 KB 压到 **1,040 字符**（mock 实测），用户消息只含盘面事实 + 经文。

### 事实层补全

- 十三神煞：改为与盘面同一套 `calcGuShiShenSha`（贵/禄/羊刃/文昌/驿马/桃花/将星/华盖/
  谋星/劫煞/灾煞/天医/天喜），不再只有 6 个，避免模型补写。
- 经文：新增 `lib/hexagram/oracle-text.ts`（64 卦，仅卦辞 + 爻辞，剥掉原版的「翻译 / 象征」注文），
  事实里带本卦卦辞、变卦卦辞、动爻爻辞，六爻全动时带用九/用六。

### 禅意 UI

`components/liuyao/ReadingPanel.tsx`：

- 盘面下方只留一个描边按钮「解 卦」，附一行「以盘面事实为凭 · 不作吉凶承诺」；
- 点击后流式落下，窄栏（640px）、宽行距（2.05）、首行缩进；
- 「一、取用」这类短行自动识别为小标题（细线 + 小字），其余按段落排；
- 竖排「观象」小标、朱砂色光标、研墨中的三点；
- 停止 / 再解一次 / 复制 / **所呈事实**（可查看发送的 JSON，证明不含密钥）；
- 换一卦自动重置；仅在用户贴着底部时自动跟随滚动。

### 验证

- mock 上游端到端：四段标题正确、5 段正文、事实抽屉含卦辞与十三神煞且无密钥泄漏、
  复制可用、桌面/390px 均无横向溢出、0 console error。
- 64 项测试通过（新增 prompt 精简断言 6 项：不重排盘、无病占专项/自检、神煞同源、用九用六等）。

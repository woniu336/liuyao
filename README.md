# 野鹤六爻 · 六爻确定性排盘

三钱摇卦 · 纳甲装卦 · 世应六亲 · 十三神煞 · 四段解卦，附《增删卜易》卦例 100 例研读。
排盘由确定性引擎计算，解读依盘面事实展开；大模型由用户自带（key 只存本机浏览器）。

- 线上：<https://zhanbu.lufei.de>
- 技术栈：Next.js 16（App Router）+ vinext / Cloudflare Workers + D1 + PWA

| 页面 | 内容 |
| --- | --- |
| `/` 起卦 | 所问 / 性别 / 时间 + 三钱摇卦（Web Crypto）· 可手动指定本卦变卦 · 移动端底部悬浮起卦 |
| `/liuyao` 排盘 | 纳甲、安世应、定六亲、旬空、伏神、六神、月卦身、十三神煞；四段解卦（取用 / 盘面 / 走势 / 应期） |
| `/examples` 案例 | 《增删卜易》卦例 100 例：古筮知识 / 原注 / 用神·吉凶·应期；每例可一键还原盘面 |
| `/cases` 历史排盘 | 只存起卦输入，打开时由引擎重排同一卦 |
| `/classics` 古籍 | 周易经传与象数文献入口（原文核校后逐步加入） |

> 本文即是**部署文档**：从零把本项目部署到 Cloudflare Workers + D1 + 自有域名。
> 更深的取舍与约束见 [docs/cloudflare.md](docs/cloudflare.md)，开发交接见 [NEXT.md](NEXT.md)。

---

## 0. 先决条件

| 项 | 要求 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 20（推荐 22） | 构建与 CLI |
| Cloudflare 账号 | 免费即可 | Workers / D1 / 自定义域名都在免费额度内 |
| 域名 | 已托管在同一个 CF 账号 | 否则无法用 Custom Domain 绑定 |
| `cf` CLI | `npm i -g cf` | 新版官方 CLI（也可以用 `npx cf`） |

```bash
node -v          # v22.x
npm i -g cf
cf --version
```

本地先跑通一次（可选但强烈建议）：

```bash
npm install
npm run dev:vinext      # http://localhost:3001，workerd + 本地 D1
npm run check           # schema + portability + 测试
```

---

## 1. 登录 Cloudflare

```bash
cf auth login
```

设备码流程：终端会给出一个链接和验证码，浏览器打开
<https://dash.cloudflare.com/oauth2/device/verify> 输入验证码确认即可（5 分钟内有效）。

```bash
cf auth whoami     # 确认已登录
cf auth list       # 查看本地 profile
```

> CI 或不想用浏览器授权时，也可以在环境变量里放 `CLOUDFLARE_API_TOKEN`（需要 Workers / D1 / Zone 权限）。

---

## 2. 建 D1 数据库

```bash
cf d1 create --name liuyao-db
```

会返回一个 `uuid`。**不用手工建表** —— 应用首次访问 `/api/cases` 时会惰性执行
`migrations/0001_init.sql`（`CREATE TABLE IF NOT EXISTS cases ...`）。

想手动建也可以：

```bash
cf d1 query <uuid> --sql "$(cat migrations/0001_init.sql)"
cf d1 query <uuid> --sql "SELECT name FROM sqlite_master WHERE type='table'"
```

> 数据库名必须和 `cloudflare.config.ts` 里的 `bindings.d1({ name: 'liuyao-db' })` 一致。
> 部署时 `--provision` 默认开启，D1 不存在会自动创建。

---

## 3. 配置域名与变量

部署配置在 `cloudflare.config.ts`（TypeScript，有类型检查，写错字段会当场报错）。

### 3.1 自定义域名

用环境变量传，避免把域名写死在仓库里：

```bash
WORKER_DOMAIN=zhanbu.example.com npx cf deploy
```

配置里对应的是 **Custom Domain**（会自动建 DNS 记录 + 证书）：

```ts
...(workerDomain ? { domains: [workerDomain] } : {}),
```

> 注意：不要用 `triggers.fetch({ pattern })` 代替 —— 路由不会自动建 DNS 记录，
> 会得到「部署成功但域名打不开」。Custom Domain 才是子域名的正确姿势。

不设 `WORKER_DOMAIN` 就只挂 `*.workers.dev`（首次部署会问一次子域名）。

### 3.2 运行时变量

| 变量 | 必需 | 作用 |
| --- | --- | --- |
| `LLM_ALLOWED_HOSTS` | 有默认值 | 上游域名白名单（逗号分隔后缀）。默认已含 opencode.ai / deepseek.com / api.openai.com / api.moonshot.cn / open.bigmodel.cn / dashscope.aliyuncs.com / openrouter.ai / api.siliconflow.cn |
| `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` | 否 | 服务端兜底模型（正常不需要：用户在页面「设置」里自带 key） |
| `LLM_THINKING` / `LLM_REASONING_EFFORT` | 否 | 兜底模型的思考模式 / 强度 |

**大模型 key 不需要配到服务端**：用户在右上角「设置」里填，只存自己浏览器的
`localStorage['liuyao.llm.v1']`，解卦时随请求体发给 `/api/read`，服务端只转发一次。

想改白名单，直接传环境变量即可覆盖默认值：

```bash
LLM_ALLOWED_HOSTS=opencode.ai,api.deepseek.com npx cf deploy
```

---

## 4. 部署

```bash
WORKER_DOMAIN=zhanbu.example.com npx cf deploy
```

`cf deploy` 会先跑构建（`build:vinext`），再上传静态资源 + Worker。成功输出类似：

```
✨ Success! Uploaded 46 files
Total Upload: 1553.77 KiB / gzip: 487.06 KiB
Your Worker has access to the following bindings:
  env.DB (liuyao-db)                       D1 Database
  env.ASSETS                               Assets
  env.LLM_ALLOWED_HOSTS ("opencode.ai,…")  Environment Variable
Uploaded liuyao
Deployed liuyao triggers
  zhanbu.example.com (custom domain)
◆  Deploy complete
```

只检查不发布（强烈建议首次先跑）：

```bash
WORKER_DOMAIN=zhanbu.example.com npx cf deploy --dry-run
```

---

## 5. 上线验收清单

```bash
curl -I https://zhanbu.example.com/                     # 200
curl -I https://zhanbu.example.com/examples             # 200
curl -I https://zhanbu.example.com/cases                # 200
curl -I https://zhanbu.example.com/manifest.webmanifest # 200（PWA）
curl -I https://zhanbu.example.com/sw.js                # 200（离线壳）
curl -I https://zhanbu.example.com/data/zengshan-cases.json  # 200（案例数据）
```

接口自检（应分别得到 501 / 403 / 403）：

```bash
# 1) 没配模型 → 501
curl -s -X POST https://zhanbu.example.com/api/read \
  -H 'Content-Type: application/json' -d '{"facts":{"kind":"liuyao","lines":[]}}'

# 2) 跨站 Origin → 403
curl -s -X POST https://zhanbu.example.com/api/read \
  -H 'Content-Type: application/json' -H 'Origin: https://evil.example.com' \
  -d '{"facts":{"kind":"liuyao","lines":[]}}'

# 3) 白名单外上游 → 403
curl -s -X POST https://zhanbu.example.com/api/read \
  -H 'Content-Type: application/json' -H 'Origin: https://zhanbu.example.com' \
  -d '{"facts":{"kind":"liuyao","lines":[]},"llm":{"baseUrl":"https://evil.example.com/v1","model":"x","apiKey":"k"}}'
```

D1 是否就绪：

```bash
cf d1 query <uuid> --sql "SELECT name FROM sqlite_master WHERE type='table'"
# 应看到 cases
```

浏览器里再走一遍：起卦 → 排盘 → 设置里填模型 → 测试连接 → 解卦 → 历史排盘能回看。

---

## 6. 边缘限流（建议）

免费套餐的限制：**每个 phase 只能 1 条规则、`period` 只能是 10 秒、不能用 `matches` 运算符**。
所以规则只能写成「10 秒 N 次 + 路径包含」。

```bash
# 找到 zone 的 http_ratelimit 规则集
cf rulesets list --zone example.com        # 取 phase=http_ratelimit 的 id

# 规则文件（注意 characteristics 必须带 cf.colo.id；mitigation_timeout 只能为 0 或 ≥ period）
cat > rl.json <<'EOF'
[
  {
    "action": "block",
    "description": "API 限流（10 秒内最多 4 次）",
    "enabled": true,
    "expression": "(http.request.uri.path contains \"/api/\")",
    "ratelimit": {
      "characteristics": ["ip.src", "cf.colo.id"],
      "mitigation_timeout": 10,
      "period": 10,
      "requests_per_period": 4
    }
  }
]
EOF

cf rulesets update <ruleset-id> --zone example.com --id <ruleset-id> --rules @rl.json
```

> 应用内还有一层：`/api/read` 8 次/分 + 60 次/时（进程内计数，只在单实例内准确）。
> 想要「每分钟 / 每小时」粒度的边缘规则需要 Pro（Advanced Rate Limiting）。

---

## 7. 日常更新与回滚

```bash
git pull
npm run check                                    # 先本地全绿
WORKER_DOMAIN=zhanbu.example.com npx cf deploy   # 重新发布（秒级）
```

- **回滚**：`cf workers deployments list liuyao` 找到上一版本，
  `cf workers deployments rollback liuyao`（或控制台 Workers → Deployments 一键回滚）。
- **看日志**：`cf workers tail liuyao` 或控制台 Workers Logs。
- **D1 备份**：`cf d1 export <uuid> --output backup.sql`（定期存一份）。

---

## 8. 常见坑

| 现象 | 原因 / 处理 |
| --- | --- |
| 部署成功但域名 502/000 | 用了 `triggers.fetch` 路由却没 DNS 记录 → 改用 Custom Domain（`domains: [...]`）；证书签发需要 1–2 分钟 |
| 静态资源 307 循环 | `public/` 下文件名带 `@`（如 `coin-4@2x.png`）：Workers Assets 会把 `@` 编码成 `%40` 再跳回来。用 `-2x` / `-3x`。`npm run check:portability` 已加守卫 |
| 页面能开但按钮全不动 | 手机用局域网 IP 访问 dev 时被 Next 拦了 chunk：`next.config.ts` 已把非回环 IPv4 放进 `allowedDevOrigins`；线上不受影响 |
| 解卦返回 501 | 没配模型：页面右上角「设置」里填 baseUrl / model / key |
| 解卦返回 403「上游域名不在允许列表内」 | 目标供应商没进 `LLM_ALLOWED_HOSTS`：加进环境变量重新部署 |
| 解卦返回 403「仅接受本站页面发起的请求」 | 请求带了别的站点的 `Origin`：这是防代理设计，正常用页面点不受影响 |
| D1 报 `no such table: cases` | 首次访问 `/api/cases` 会自动建表；确认 `DB` 绑定名与配置一致 |

---

## 9. 目录与关键文件

```
cloudflare.config.ts      Worker 名 / 绑定 / 自定义域名（部署配置的唯一事实源）
migrations/*.sql          D1 表结构（gen:schema 生成运行时建表常量）
app/api/read/route.ts     解卦 SSE 代理（同源校验 + 双窗限流 + 上游白名单）
app/api/llm-test/route.ts 模型连通性测试
app/api/cases/route.ts    卦例读写（D1，按匿名设备 Cookie 隔离）
lib/llm/settings.ts       供应商预设 / 校验 / localStorage
lib/llm/server.ts         服务端校验 + SSRF 拦截 + 白名单
public/sw.js              PWA 离线壳
scripts/check-portability.mjs  Workers 兼容性守卫（禁 node:*、next/image、@ 文件名等）
```

---

## 10. 技术要点

**引擎与差分**：`lib/liuyao/najia.ts` 是 bazi-web 参考实现的逐条移植，`tests/fixtures/python-baseline.json`
存了 4696 案的 SHA-256 指纹，`tests/liuyao-parity.test.ts` 逐案比对；纳甲/六亲/世应/六神/伏神/动变
全部按同一口径。

**随机源**：每次投掷都来自 Web Crypto（`crypto.getRandomValues`），逐位取 Uint32 最低有效位，
天然无偏；缺 Web Crypto 直接报错，不回落 PRNG。三钱概率严格 6/7/8/9 = 1/8 · 3/8 · 3/8 · 1/8，
`tests/random.test.ts` 钉住分布与「起卦路径不得出现 Math.random」。

**案例页**：`public/data/zengshan-cases.json` 由 `scripts/extract-zengshan-cases.mjs`
从《增删卜易卦例初探》整理文本抽取 100 例（原文不截断）；卦盘不是照抄原文，
而是由卦名反推六次投掷、再取「同月建同日辰」的公历重排，所以与「排出此卦」看到的盘面一致。

**刻意不做**：盘面上不标用神、不印吉凶判词（断语只在解卦正文里）；不取用神规则化、不排应期；
不为个案写特例（引擎只有查表与确定性算法）。

**PWA**：`app/manifest.ts` + `public/sw.js`，装到主屏后全屏无地址栏，起卦与排盘离线可用；
Service Worker 只在非本机域名注册（localhost 自动注销，避免开发缓存脏 chunk）。

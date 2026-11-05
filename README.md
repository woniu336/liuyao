# liuyao · 六爻 / 小成图 确定性排盘

从 [bazi-web](https://github.com/woniu336/bazi-web) 抽出并裁剪的两个排盘工具，单进程跑：

| 工具 | 保留 | 移除 |
| --- | --- | --- |
| **首页**（`/`） | 求测事项 / 性别 / 婚否 / 时间 + 三钱摇卦；可手动指定本卦/变卦；卦成后选择解读体系 | 起卦 UI 不藏求测人与时间信息 |
| **六爻**（`/liuyao`） | 纳甲装卦、安世应、定六亲、旬空、伏神、六神、月卦身、十三神煞；可请求禅意解读 | 模型不重排盘，只解释确定性事实 |
| **小成图**（`/xct`） | 独立起卦 + 接收首页六爻卦；用宫、九宫四象、正推解盘 | 不混入六爻的五行、六亲、世应体系 |
| **易学典籍**（`/classics`） | 周易经传与象数文献入口 / 分类框架 | 原文与版本核校后逐步加入 |

排盘由确定性引擎负责；解读依盘面事实展开，不重排、不改写盘面。问句用于表达所问与解读上下文，不参与物理排盘计算。

## 起卦首页与视觉

首页参考用户提供的 `设计参考.txt` 与设计图：顶部导航「起卦 / 卦例 / 易学典籍 / 关于」、
淡墨山水、宣纸求测笺与真铜钱摇卦。页首只保留「取象于天地，观变于阴阳」，标题区较短。

- 求测事项、性别、婚否、时间都在明面；婚否用于小成图婚占取用。
- 三枚铜钱用 `coin-4`（字）/ `coin-3`（背）真图，保持原设计尺寸（移动约 74px / 宽屏 84px）；
  使用 2x/3x sourceSet，Web Crypto 掷币，动画落定后提交结果。
- 爻象生成台排在铜钱下方；手动指定为可输入的六十四卦下拉（全名/简称均可搜），动爻自动比对。
- 手机单列，PC 使用更宽的居中宣纸卡；三枚铜钱、字段、爻象保持在同一中轴。
- `/classics` 已预留周易经传与易学典籍入口，当前是分类/来源校核空态，原文按来源与版本核验后再加入。

## 跑起来

```bash
npm install
npm run dev          # 前台：http://localhost:3000
npm run dev:bg       # 后台：日志写 logs/dev.out.log，按端口重启旧进程
npm test             # 引擎自证 + 差分对齐（见下）

# Cloudflare Workers 回路（分支 spike/vinext 验证通过；M1 起成为部署目标）
npm run dev:vinext      # vite dev（workerd，带本地 D1 绑定）
npm run build:vinext    # vite build
npm run start:vinext    # vite preview（生产包本地验证）
npm run deploy:vinext   # 需要先 cf auth login
```

`npm run dev/build` 走 `scripts/next.mjs`：先清掉宿主进程可能泄漏进来的
`__NEXT_PRIVATE_STANDALONE_CONFIG` 等私有变量再启动 Next。不清的话，
这些变量会被当成真实配置读入（distDir 被改写、outputFileTracingRoot 指到不存在的路径），
表现为 dev 起不来或 build 报 `TypeError: generate is not a function`。

手机用局域网 IP 打开时，`next.config.ts` 会把本机所有非回环 IPv4 放进
`allowedDevOrigins`。否则 Next 16 会拦掉 `/_next/static/chunks/*.js`，
页面看着完整、按钮全部不动（React 没 hydration）。

## 目录

```
app/                    首页 / 六爻页 / 小成图页
components/liuyao/      六爻：LiuyaoView（起卦表单）· CastWorkbench（三钱/大衍）· ManualCast · HexagramBoard（古法卦单）
components/xct/         小成图：XiaoChengTuView · NinePalaceBoard · HexagramFigure · ZhengTuiPathView · VerdictCard · ReportView
lib/liuyao/najia.ts     六爻确定性排盘引擎（core.py 的逐条移植）
lib/liuyao/board-view.ts 引擎结果 → 盘面视图数据 + 复制文本
lib/liuyao/ganzhi.ts    起卦时刻 → 四柱干支
lib/xct/                小成图引擎（boardBuilder / judgeEngine / dagTracker / constants / guizang）
lib/hexagram/           六爻几何与 64 卦查表（矢量爻象用）
tests/                  差分基准与引擎自证
```

## 解卦

六爻盘面下方有「解 卦」入口：只把**盘面事实**（含十三神煞与卦爻辞）发到服务端，
prompt 在服务端拼、密钥只在服务端，流式返回四段式解读（取用 / 盘面 / 走势 / 应期）。
UI 取纸上批注的克制排版；可查看「所呈事实」，确认没有多传东西。

- 未配置 LLM 时返回 501，不会假装解读。
- 后台 `/admin` → 「LLM 切换」里配置 provider、模型、思考模式与强度；密钥本身只进服务端环境变量。
- 本地密钥放 `.llm.local`（已 gitignore），启动脚本会加载它。
- 当前默认：opencode 网关 · `deepseek-v4.1-flash` · 思考模式 high；输出 400–550 字（硬上限 600），
  四段固定为取用 / 盘面 / 走势 / 应期，涉及病症时启用病占专项。

## 公告与统计

页面仍是静态的，公告与统计配置由 `/api/site-config` 在客户端拉取：

- 公告条：后台启用后全站顶部出现，可按 `updatedAt` 关闭；接口失败不显示，不影响排盘。
- 统计：只接受结构化配置（Cloudflare Web Analytics / Umami / Plausible），运行时注入
  `<script>`；不接任意 JS snippet。

## 后台（`/admin`）

公告 · LLM 切换 · 流量统计配置 · 审计。数据存 D1（本地用 miniflare），
密钥只放服务端环境变量（profile 里只填变量名）。

```bash
npm run dev:vinext   # http://localhost:3001/admin  （本地 D1；开发默认口令 dev-admin）
npm run dev          # 无绑定，后台是内存模式（界面会标明）
```

- 口令：`ADMIN_PASSWORD` + 会话密钥 `ADMIN_SESSION_SECRET`；生产缺一即 503。
- 开发默认口令只对本机 hostname 生效，线上域名不会启用。
- 结构见 [docs/cloudflare.md](docs/cloudflare.md) 第八节；schema 在 `migrations/*.sql`，
  `npm run gen:schema` 生成运行时建表常量，`npm run check` 校验一致性 + 可移植性 + 测试。

## 六爻盘面版式

`components/liuyao/HexagramBoard.tsx` 是 bazi-web `components/zhanbu/MobileHexagramPoster.tsx`
embedded 分支的逐行搬运，只换数据来源：

- 占问 + 男占/女占落款、时空看板（公历 / 月建+日辰 / 旬空 / 十三神煞）
- 双卦对瞻表头（本卦 · 变卦，附归魂/游魂/六冲/六合）
- 定宽栅格：六神 32 / 本卦纳甲 68 / 爻画 46 / 世应 18 / 动爻 22 / 变卦纳甲 68 / 变爻画 46 / 动变标签 52
- 伏神就地引出 `↑伏神: 妻财子水`

版式未靠目测：同一份盘面数据分别交给原组件与本仓库组件渲染 4 类卦例
（初爻动附伏神 / 静卦 / 六爻全动 / 混杂多动），逐元素比对 DOM 结构、文本、相对几何与
字号/字重/颜色，结果完全一致。问句与性别只作落款，不参与计算。


## 六爻引擎的验证方式

`lib/liuyao/najia.ts` 是对 bazi-web `src/engine/core.py::HexagramEngine` 的逐条移植。
为了不靠"看起来对"，用原引擎生成差分基准再逐案比对：

```bash
# 基准已提交在 tests/fixtures/python-baseline.json（4696 案，SHA-256 指纹）
python tests/generate_python_baseline.py   # 需要 bazi-web 在同级目录；仅重建基准时用
npm test
```

- 4096 种三钱投掷组合（固定丙午年 / 申月 / 己丑日 / 申时）
- 600 组随机年/月/日/时 + 投掷（覆盖十神起例、神煞、旬空全干支）
- 比对字段：本卦/变卦名、动爻、旬空、月卦身、驿马桃花禄神贵人、
  六爻的纳甲/六亲/世应/六神/伏神（含飞伏生克描述）/动爻变出

新增的「天医（月建前一位）」「文昌（依日干）」不参与差分（原 core.py 没有），
由 `tests/liuyao-engine.test.ts` 单独断言。

## 小成图引擎

`lib/xct/` 与 bazi-web 同源，未改算法。`tests/xct-engine.test.ts` 遍历
64×64 种本卦/之卦组合 × 9 宫，断言：

- 八方断语必落在四象八断集合内，中宫恒为「归藏之枢」；
- 任一起点宫位的正推链都会收敛（归位 / 闭环 / 归藏 / 链止），不会死循环。

裁剪后没有了"用神在哪一宫"，正推起点改为**读者点选的宫位**（默认中宫立极）。
这不是算法改动，只是去掉了用神层。

## 服务端边界（为 Cloudflare 预留）

- `lib/store/`：卦例存储接口（异步）—— 本地 localStorage / 远端 D1 两种实现。
  `/cases` 里可收藏、打开复原（只存起卦输入，盘面由引擎重算）、删除。
  接上 D1 后按**匿名设备 Cookie** 归属（`ly_device`），旧本地卦例首次访问自动迁移；
  换浏览器/清 Cookie 会得到新的卦例夹（跨设备需以后接账号）。
- `lib/readings/`：解卦**事实契约**（客户端只发盘面事实与问句）。
  `app/api/read/route.ts` 是服务端流式代理：prompt 在服务端拼（`route` 同目录 `prompt.ts`），
  密钥只在服务端 env/secret，未配置时明确返回 501。暂无前端入口，断卦口径待定。
- `scripts/check-portability.mjs`：`npm run check:portability` 守住 Workers 兼容性
  （禁 `fs`/`node:*`、`next/image`、`next/font`、锁死 `output: 'export'`）。
- 目标与约束、后台规划、部署触发条件见 [docs/cloudflare.md](docs/cloudflare.md)。

## 刻意不做的事

- 不取用神、不判吉凶、不排应期：这些属于规则层，原项目在五层 DAG 里，本仓库不搬。
- 不接大模型：没有提问 → 意图 → 用神 → prompt 的链路，也没有流式解卦面板。
- 不为个案写特例：引擎只有查表与确定性算法，没有 `if case_id == ...` 之类的补丁。

## 起卦随机源（可核查）

起卦的每一次投掷都来自 **Web Crypto**（`crypto.getRandomValues`），不存在 `Math.random`：

- `lib/liuyao/random.ts`：逐位取 Uint32 最低有效位（2^32 可整除 2，天然无偏）；
  小成图「随机报数」用拒绝采样（拒绝 ≥ 2^32−6 的采样值），同样无模偏差。
- 环境缺少 Web Crypto 时**直接报错**，不静默回落到 PRNG。
- `/design` 页会实时跑 2000 掷并显示字/背占比与爻值偏差，可自行核对。
- 测试（`tests/random.test.ts`）钉三件事：每次投掷都真的调用了 `getRandomValues`、
  大样本分布通过卡方检验、起卦相关源码里不得出现 `Math.random`（注释除外）。

独立核查（50 万掷）：字/背 = 750499 / 749501（字面 50.033%），
卡方 字背 0.664（df=1，临界 3.84）、爻值 3.284（df=3，临界 7.81）—— 均通过。

## 铜钱与布局

- 铜钱照片：`public/images/coin-4.png`（字面）/ `coin-3.png`（背面），
  `components/liuyao/Coin.tsx` 用 3D `rotateY` 真翻转，落地由结果决定（正面 0°/背面 180°），
  翻滚中靠静态薄环 + 落地阴影保持"三枚始终可数"，不会出现照片转到 90° 而"凭空消失"。
- 布局：移动单栏；`lg`（≥1024）起为**案头两页**——左侧起卦与盘面（520px），右侧九宫与解卦（自适应）。

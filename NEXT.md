# 交接：继续开发（当前进程）

> 新开窗口后先 `@NEXT.md` 引入本文件，再开工。

## 先读

- `AGENTS.md`（若有）与 `README.md`
- 上一提交：`1821fa6 docs: 新增 NEXT.md 交接文档，README 指向`
- 工作树应为干净；dev 服务在 <http://localhost:3001>（vinext/workerd + 本地 D1）

## 已完成（不要重做）

- **六爻纳甲引擎** `lib/liuyao/najia.ts`：与 bazi-web 原 Python `core.py` 4696 案 SHA-256 差分全一致。
- **随机源** `lib/liuyao/random.ts`：逐位取 Uint32 LSB，Web Crypto 实现，缺 crypto 即 fail-closed；
  50 万掷实测 6:0.1255 / 7:0.3746 / 8:0.3753 / 9:0.1246。
- **首页** `components/cast/CastPage.tsx` 已按设计图重做：淡墨山水 `InkLandscape` + 宣纸求测笺；
  页首只留「取象于天地，观变于阴阳」，标题 34/40/44px，hero 168/188/214px，内容宽 `max-w-[1040px]`。
- **六十四卦可输入下拉** `components/cast/GuaCombobox.tsx` + `lib/liuyao/hexagram-index.ts`（旧 `GuaPicker` 已删）。
- **结果页** `components/liuyao/LiuyaoResult.tsx` 单列居中 + 右上「截图确定性排盘」（`html-to-image` toPng pixelRatio 3）。
- `/classics` 与 `/about` 已建（classics 是分类 / 来源校核空态）。
- **站名与导航**：站名 **野鹤六爻**（毛笔艺术字，见下），共享页头 `components/site/SiteHeader.tsx`
  （左站名，右 **六爻 / 历史排盘** + 「设置」；古籍已从导航移除，页面仍在 `/classics`）。
- **站名艺术字**：`public/fonts/yehe-brand.woff2` 是「马善政毛笔楷书」按 4 个字（野鹤六爻）做的子集
  （2.7KB，OFL-1.1，`public/fonts/OFL-MaShanZheng.txt`），`app/globals.css` 里 `.font-brand` 使用，
  回退栈 STXingkai / 华文行楷 / KaiTi。改站名要重新子集，否则回退字体。
- **起卦弹窗**：卦成弹窗与手动指定弹窗都居中（不再是底部抽屉），卦成后只有一个「排盘解卦」。
- **六爻结果页按设计稿重做**（`components/liuyao/LiuyaoResult.tsx`）：
  卦名 `本卦 ⇌ 变卦` + 公历干支 + 太极分隔 + 淡金边盘面纸 + 「用神 / 伏神」行；
  解卦四段用「圆标序号 + 标题 + 发丝线」。
  顶部工具条：历史排盘 / 重新起卦 / 截图；**底部固定栏只承载当前动作**（解卦 → 停止），读完自动收起。
  「保存」按钮已删：**解卦完成即静默归档**进历史排盘（`onSave` 在 phase=done 时调一次）。
  「再解一次」已删（面板只留 停止 / 重试 / 复制 / 所呈事实抽屉——抽屉是给模型的事实包，必须保留）。
- **用神解析**（`lib/liuyao/use-god.ts`）：认「以财爻为用」类取用句（含单字简称）；地支只在全文该六亲唯一出现时补齐；
  **给了地支就只认精确匹配**，不再回退到「六亲唯一」去猜。注意：盘面上**已不显示用神标注**（用户要求），
  lib 与测试保留，将来若恢复高亮可直接接 `HexagramBoard` 的 `highlightPosition`。
- **六爻结果页第二轮**：去掉用神标注；底部只放当前动作（解卦 / 停止）；
  「重新起卦」直接回首页起卦台（`router.replace('/')`，不再回到旧版 `/liuyao` 表单）。
- **首页第二轮**：删「一键起卦」；「手动指定」移到铜钱下方进度圆点行的右侧；
  掷钱起爻按钮收窄到 `max-w-[300px]`、圆角 6px；右上加「历史排盘」；
  题签上移（146/162/182px）、副标题 14/15/16px、PC 内容宽 `max-w-[960px]`。
- **案例页**（`/examples`，导航「案例」）：`public/data/zengshan-cases.json`（100 例，74KB，静态资源按需 fetch），
  生成脚本 `scripts/extract-zengshan-cases.mjs`（源：`bazi-web/artifacts/refs/增删卜易卦例初探230例.txt`）。
  **版式**（第三版，现代研读档案）：桌面端「主内容 + 右侧吸顶侧栏」（检索 / 快筛胶囊 / 页码 / 读法 / 配色切换），
  移动端侧栏落到列表上方；每例一张卡：占问标题 + 例号 / 古筮知识 / 占问时间与得卦 / 卦盘（独立成块，视觉中心）
  / 原注（按句断段）/ 01 选取用神 · 02 吉凶判断 · 03 应期细节 三张卡 / 操作（朱砂主按钮「排出此卦 · 看完整盘面」+ 描边「复制此例」）。
  **两套配色**：暖纸（默认，`#F7F4EF` 底 + 朱砂 `#C23A2B`）与冷白（`#F5F7F8` 底 + 浅青灰面 + 古铜 `#8A5A2B`），
  选择存本机 `liuyao.examples.palette`；冷白时页头也切 `tone="cool"`。每页 6 例。
  卦盘不是照抄原文（原文空格已乱），而是用同一引擎按「投掷值 + 同月建同日辰的公历」重排，与点「排出此卦」看到的盘面一致。
  投掷值由卦名反推；公历取 1990–2026 内最早命中（古例不记年）。3 例原缺月建/干支，不给卦盘与排盘入口。
- **设置默认模型**：DeepSeek 默认 `deepseek-flash`（下拉里还有 chat / reasoner）。
- **排盘页顶部去掉「重新起卦」**：只留 历史排盘 / 截图 / 设置。
- **后台已移除 + 设置（大模型）**：
  - 删 `app/admin`、`app/api/admin/*`、`components/admin/*`、`lib/admin/*`、公告条、统计注入、
    `/api/site-config`、`/api/announcement`；D1 迁移只剩 `cases`（`migrations/0001_init.sql`）。
    `D1Like` / `getRuntimeEnv` 移到 `lib/db/`。
  - 新增 `components/site/SettingsDialog.tsx` + `lib/llm/settings.ts`：右上角「设置」只做一件事 ——
    配大模型。预置 DeepSeek / OpenAI / Moonshot / 智谱 / 通义 / OpenRouter / SiliconFlow / Ollama / 自定义，
    按「OpenAI 兼容」通用；**只存本机 localStorage**（`liuyao.llm.v1`），不上传、不入库。
  - `/api/read` 改为接受请求体里的 `llm`（`lib/llm/server.ts` 校验：协议、模型名、**拦内网地址**、
    本机 Ollama 放行），没配时退回服务端 env；新增 `/api/llm-test` 做连通性测试。
  - 弹窗必须 portal 到 body：页头有 `backdrop-blur`，会成为 fixed 后代的包含块。
- **小成图整体下线（用户决定，不可回退）**：删 `app/xct`、`components/xct/*`、`lib/xct/*`、
  `app/api/read/prompt-xct.ts`、`docs/xct-prompt-spec.md`、`tests/xct-*.test.ts`；
  `readings` 的 xct 事实类型、`cases` 的 xct 记录类型与校验分支、`store` 的 xct 读写分支一并清理；
  历史排盘只列 `kind=liuyao`（旧 xct 记录留在库里但不再显示）。
- `/cases` 更名「历史排盘」（UI 文案 + metadata）。
- 全局 `<footer>` 已从 `app/layout.tsx` 删除。
- **移动端悬浮起卦**：首页 `sm` 以下把「掷钱起爻」做成底部固定条（`safe-bottom`），行内按钮 `hidden sm:block`。
- **首页第三轮**：删「婚否」与「随机源核查」；「手动指定」移到「重新起卦」下方居中；
  起卦时间的原生选择器图标隐藏，改成中文「修改」按钮（`input.showPicker()`，`app/globals.css` 的 `.no-native-picker`）。
- **PC 排盘页两栏**（用户定稿）：`lg:grid-cols-[440px_1fr]`，左栏卦名 + 盘面（吸顶，卡片仍 440 不变）
  + 盘面下方的解卦按钮；右栏是一张解卦纸（idle 时居中提示，读完全文落纸）。
  移动端仍单列中轴 + 底部悬浮动作条。
- **移动端首页首屏**：`sm` 以下不显示山水题签与「起 卦」大标题（纸笺上移），
  并删掉「跟随此刻 / 归位当前」标签（默认即当前时刻，改时间用「修改」）。
- **截图错位修复**：`html-to-image` 克隆节点时 `mx-auto` 会按外层容器重新居中，宽屏下（卡片 440 < 容器）整块右移被裁。
  现在 `toPng` 传 `width/height` + `style:{ margin:'0', transform:'none' }`，PC 导出与屏幕一致。
- **解卦体验**：起解即 `scrollIntoView` 到解卦段（`scroll-mt-20` 避开吸顶条），等待态换成「研墨中」墨滴动画
  （`.ink-ripple` / `.ink-drop`，见 `app/globals.css`，尊重 `prefers-reduced-motion`）。
- **动爻位提示修正**：`movingPositions` 是 0-based，页面文案错一位；新增 `movingLineNumbers`（1-based）并补测试。
- **hydration 修复**：结果页/复原占位不能在 render 里读 `window`，改为 `useIsoLayoutEffect` 置位。
- `npm run check` = check:schema + check:portability + 78 项测试，全绿；`next build` 与 `build:vinext` 均通过。

## 硬约束（违反即返工）

- 随机必须 `crypto.getRandomValues`，禁止 `Math.random`；三钱概率严格 **6:1/8 · 7:3/8 · 8:3/8 · 9:1/8**。
- 字面 = 2、背面 = 3；**8 少阴 = 背背字**。
- 铜钱用 `public/images/coin-4.png`（字）/ `coin-3.png`（背），CSS 尺寸 74px（≥640 为 84px），
  不得放大（会发虚）；已有 `@2x` / `@3x`。
- 六爻盘面版式必须与原项目 `MobileHexagramPoster` 等价；盘面只呈现确定性排盘，不标用神、不印吉凶。
- 解卦 prompt：400–550 字，硬上限 600；四段 = 取用 / 盘面 / 走势 / 应期。
- 大模型 key **只存用户本机 localStorage**，随请求体转发一次，不落库、不写日志、不回显；
  自建部署的 env 兜底 key 只放 `.llm.local`（已 gitignore），不进仓库、不进 D1。
- 不得修改 `C:\Users\奇哥\Desktop\bazi-web` 源码（只允许读取 / 复制）。
- 部署目标是 Cloudflare Workers，但**暂不部署**；`npm run check:portability` 必须保持通过。

## 命令

```bash
npm run dev:vinext     # 3001，带 D1 绑定（改完后端/接口用这个验证）
npm run dev:bg         # 后台 + logs/dev.out.log
npm run check          # schema + portability + 78 测试
npm run build && npm run build:vinext
```

重启 3001：kill 占用端口的 PID 后 `rm -f .vinext/dev/lock.json`。

UI 实测脚本写在 `C:\Users\奇哥\Desktop\bazi-web\scratch\*.mjs`（那里才有 `playwright-core`），
浏览器 `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`，加 `--no-proxy-server`；
时间输入框约 1s 后才自动填入，等待 ≥1500ms 再断言。

## 下一步（按序）

1. **S2 盘面收尾**：字号线宽 / 神煞字号（看板 12.5 vs 12）统一 —— 版式不可动，只能微调字重。
2. **`/classics` 填入经校核的周易原文**（来源与版本必须标注，未核校就保持空态）。
3. **部署准备**：Node ≥26.12、`cf auth login`、secret 注入实测（仍不要真部署）。
4. **小成图如果要做回来**：代码在 `git show 04bbaa8:lib/xct/...` 可取回（引擎与 prompt 都在那个提交里）。

## 已知问题

- 铜钱源图仅 85×85，即使 `@3x` + Lanczos + UnsharpMask 仍略虚；若用户再提，需换更高分辨率原图。
- `components/design/DesignPreview.tsx`（`/design` 页）仍是旧版设计稿内容，未随新视觉重做。
- `build:vinext` 有非致命警告：`vite.config.ts:4` 的 `import "./lib/dev/dev-origins"` 缺扩展名。

## 收工纪律

每次改完必须跑 `npm run check` + 两个 build，报错就别提交。

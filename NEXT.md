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
- **站名与导航统一**：站名「易林寻踪」（`app/layout.tsx` 标题同），
  共享页头 `components/site/SiteHeader.tsx`（左篆印 + 站名，右 **六爻 / 古籍 / 历史排盘**，可插 `actions`），
  首页、`/cases`、`/classics` 已接入；结果页用 `showNav={false}` + 工具条。
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
- **小成图整体下线（用户决定，不可回退）**：删 `app/xct`、`components/xct/*`、`lib/xct/*`、
  `app/api/read/prompt-xct.ts`、`docs/xct-prompt-spec.md`、`tests/xct-*.test.ts`；
  `readings` 的 xct 事实类型、`cases` 的 xct 记录类型与校验分支、`store` 的 xct 读写分支一并清理；
  历史排盘只列 `kind=liuyao`（旧 xct 记录留在库里但不再显示）。
- `/cases` 更名「历史排盘」（UI 文案 + metadata）。
- 全局 `<footer>` 已从 `app/layout.tsx` 删除。
- **移动端悬浮起卦**：首页 `sm` 以下把「掷钱起爻」做成底部固定条（`safe-bottom`），行内按钮 `hidden sm:block`。
- **首页第三轮**：删「婚否」与「随机源核查」；「手动指定」移到「重新起卦」下方居中；
  起卦时间的原生选择器图标隐藏，改成中文「修改」按钮（`input.showPicker()`，`app/globals.css` 的 `.no-native-picker`）。
- **截图错位修复**：`html-to-image` 克隆节点时 `mx-auto` 会按外层容器重新居中，宽屏下（卡片 440 < 容器）整块右移被裁。
  现在 `toPng` 传 `width/height` + `style:{ margin:'0', transform:'none' }`，PC 导出与屏幕一致。
- **解卦体验**：起解即 `scrollIntoView` 到解卦段（`scroll-mt-20` 避开吸顶条），等待态换成「研墨中」墨滴动画
  （`.ink-ripple` / `.ink-drop`，见 `app/globals.css`，尊重 `prefers-reduced-motion`）。
- **动爻位提示修正**：`movingPositions` 是 0-based，页面文案错一位；新增 `movingLineNumbers`（1-based）并补测试。
- **hydration 修复**：结果页/复原占位不能在 render 里读 `window`，改为 `useIsoLayoutEffect` 置位。
- `npm run check` = check:schema + check:portability + 94 项测试，全绿；`next build` 与 `build:vinext` 均通过。

## 硬约束（违反即返工）

- 随机必须 `crypto.getRandomValues`，禁止 `Math.random`；三钱概率严格 **6:1/8 · 7:3/8 · 8:3/8 · 9:1/8**。
- 字面 = 2、背面 = 3；**8 少阴 = 背背字**。
- 铜钱用 `public/images/coin-4.png`（字）/ `coin-3.png`（背），CSS 尺寸 74px（≥640 为 84px），
  不得放大（会发虚）；已有 `@2x` / `@3x`。
- 六爻盘面版式必须与原项目 `MobileHexagramPoster` 等价；盘面只呈现确定性排盘，不标用神、不印吉凶。
- 解卦 prompt：400–550 字，硬上限 600；四段 = 取用 / 盘面 / 走势 / 应期。
- 密钥只放 `.llm.local`（已 gitignore），不进仓库、不进 D1。
- 不得修改 `C:\Users\奇哥\Desktop\bazi-web` 源码（只允许读取 / 复制）。
- 部署目标是 Cloudflare Workers，但**暂不部署**；`npm run check:portability` 必须保持通过。

## 命令

```bash
npm run dev:vinext     # 3001，带 D1 绑定（改完后端/接口用这个验证）
npm run dev:bg         # 后台 + logs/dev.out.log
npm run check          # schema + portability + 94 测试
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

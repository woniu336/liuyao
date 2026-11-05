# 交接：继续开发（当前进程）

> 新开窗口后先 `@NEXT.md` 引入本文件，再开工。

## 先读

- `AGENTS.md`（若有）与 `README.md`
- 上一提交：`703fee4 design(home): 依新设计图重做首页并收紧标题留白`
- 工作树应为干净；dev 服务在 <http://localhost:3001>（vinext/workerd + 本地 D1）

## 已完成（不要重做）

- **六爻纳甲引擎** `lib/liuyao/najia.ts`：与 bazi-web 原 Python `core.py` 4696 案 SHA-256 差分全一致。
- **小成图引擎** `lib/xct/*`（boardBuilder / judgeEngine / dagTracker / guizang / yong-gong / yi-bian）。
- **随机源** `lib/liuyao/random.ts`：逐位取 Uint32 LSB，Web Crypto 实现，缺 crypto 即 fail-closed；
  50 万掷实测 6:0.1255 / 7:0.3746 / 8:0.3753 / 9:0.1246。
- **首页** `components/cast/CastPage.tsx` 已按设计图重做：淡墨山水 `InkLandscape` + 宣纸求测笺；
  导航「起卦 / 卦例 / 易学典籍 / 关于」；页首只留「取象于天地，观变于阴阳」，
  标题 34/40/44px，hero 168/188/214px，内容宽 `max-w-[1040px]`。
- **六十四卦可输入下拉** `components/cast/GuaCombobox.tsx` + `lib/liuyao/hexagram-index.ts`（旧 `GuaPicker` 已删）。
- **结果页** `components/liuyao/LiuyaoResult.tsx` 单列居中 + 右上「截图确定性排盘」（`html-to-image` toPng pixelRatio 3）。
- `/classics` 与 `/about` 已建（classics 是分类 / 来源校核空态）。
- 全局 `<footer>` 已从 `app/layout.tsx` 删除。
- `npm run check` = check:schema + check:portability + 110 项测试，全绿；`next build` 与 `build:vinext` 均通过。

## 硬约束（违反即返工）

- 随机必须 `crypto.getRandomValues`，禁止 `Math.random`；三钱概率严格 **6:1/8 · 7:3/8 · 8:3/8 · 9:1/8**。
- 字面 = 2、背面 = 3；**8 少阴 = 背背字**。
- 铜钱用 `public/images/coin-4.png`（字）/ `coin-3.png`（背），CSS 尺寸 74px（≥640 为 84px），
  不得放大（会发虚）；已有 `@2x` / `@3x`。
- 六爻盘面版式必须与原项目 `MobileHexagramPoster` 等价；
  小成图绝不用五行生克 / 六亲 / 世应术语。
- 解卦 prompt：400–550 字，硬上限 600；六爻四段 = 取用 / 盘面 / 走势 / 应期，
  小成图四段 = 定宫 / 四象 / 推演 / 应期。
- 密钥只放 `.llm.local`（已 gitignore），不进仓库、不进 D1。
- 不得修改 `C:\Users\奇哥\Desktop\bazi-web` 源码（只允许读取 / 复制）。
- 部署目标是 Cloudflare Workers，但**暂不部署**；`npm run check:portability` 必须保持通过。

## 命令

```bash
npm run dev:vinext     # 3001，带 D1 绑定（改完后端/接口用这个验证）
npm run dev:bg         # 后台 + logs/dev.out.log
npm run check          # schema + portability + 110 测试
npm run build && npm run build:vinext
```

重启 3001：kill 占用端口的 PID 后 `rm -f .vinext/dev/lock.json`。

UI 实测脚本写在 `C:\Users\奇哥\Desktop\bazi-web\scratch\*.mjs`（那里才有 `playwright-core`），
浏览器 `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`，加 `--no-proxy-server`；
时间输入框约 1s 后才自动填入，等待 ≥1500ms 再断言。

## 下一步（按序）

1. **S2 盘面收尾**：字号线宽 / 神煞字号统一；用神高亮接上 `lib/liuyao/use-god.ts`
   （`parseUseGod` + `resolveUseGodLine`，`HexagramBoard` 已有 `highlightPosition` / `highlightLabel` props）。
2. **S3 小成图解卦 UI**：复用 `components/liuyao/ReadingPanel.tsx` 的禅意面板，
   走 `app/api/read/prompt-xct.ts`，四段定宫 / 四象 / 推演 / 应期。
3. **`/classics` 填入经校核的周易原文**（来源与版本必须标注，未核校就保持空态）。
4. **部署准备**：Node ≥26.12、`cf auth login`、secret 注入实测（仍不要真部署）。

## 已知问题

- 铜钱源图仅 85×85，即使 `@3x` + Lanczos + UnsharpMask 仍略虚；若用户再提，需换更高分辨率原图。
- `components/design/DesignPreview.tsx`（`/design` 页）仍是旧版设计稿内容，未随新视觉重做。
- `build:vinext` 有非致命警告：`vite.config.ts:4` 的 `import "./lib/dev/dev-origins"` 缺扩展名。

## 收工纪律

每次改完必须跑 `npm run check` + 两个 build，报错就别提交。

/**
 * 本地密钥加载（Node 侧工具脚本共用）。
 *
 * 读取项目根目录的 `.llm.local`（已 gitignore），只补齐**尚未设置**的环境变量，
 * 不覆盖真实环境变量。格式：KEY=VALUE，支持 # 注释与引号。
 *
 * 为什么不用 `.env.local`：那个文件归 Next 管；vinext/vite 的配置在 Node 侧执行，
 * 需要在启动前把变量放进 process.env，才能被 cloudflare.config.ts 映射成文本绑定。
 */
import fs from 'node:fs';
import path from 'node:path';

export function loadLocalSecrets(projectRoot) {
  const file = path.join(projectRoot, '.llm.local');
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = value;
  }
}

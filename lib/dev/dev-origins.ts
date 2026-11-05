/**
 * 开发期跨源白名单：列出本机所有非回环 IPv4。
 *
 * Next 16 默认拦截来自非本机 hostname 的 dev 资源请求（chunk、HMR）。
 * 手机用局域网 IP 打开时，HTML 与 CSS 正常，但 `/_next/static/chunks/*.js` 被拒 →
 * React 不 hydration → 页面看着完整，所有按钮点了都没反应。
 * 硬编码某个 IP 会在 DHCP 重新分配地址后失效，故每次启动现算。
 */
type Ifaces = Record<string, Array<{ family: string; internal: boolean; address: string }>>;

import os from 'node:os';

export function lanOrigins(ifaces?: Ifaces): string[] {
  const source: Ifaces = ifaces ?? (os.networkInterfaces() as Ifaces);
  const out = new Set<string>(['localhost', '127.0.0.1', '0.0.0.0']);
  for (const list of Object.values(source ?? {})) {
    for (const ni of list ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) out.add(ni.address);
    }
  }
  return [...out];
}

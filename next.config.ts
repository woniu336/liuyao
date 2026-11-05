import type { NextConfig } from 'next';
import path from 'node:path';
import { lanOrigins } from './lib/dev/dev-origins';

const nextConfig: NextConfig = {
  devIndicators: false,
  // 显式钉住 Turbopack 根目录：否则它会向上找到用户目录里的 package-lock.json，
  // 把项目根误判成 C:\Users\<user>，dev 资源请求被打成 403（页面能看、按钮全不动）。
  turbopack: { root: path.resolve(__dirname) },
  allowedDevOrigins: lanOrigins(),
  experimental: {
    // Next 16.3.0 Turbopack 启动必需：否则报 Missing field `turbopackMemoryEviction` (InvalidArg) 并退出
    turbopackMemoryEviction: 'auto',
  },
};

export default nextConfig;

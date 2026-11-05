import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { lanOrigins } from "./lib/dev/dev-origins";

export default defineConfig({
  // 手机用局域网 IP 打开 dev 服务：放行本机所有非回环 IPv4（与 next dev 的 allowedDevOrigins 同理）
  server: {
    host: true,
    allowedHosts: lanOrigins(),
  },
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});

import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// 1. 配置 PWA 插件的行为
const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // 开发环境禁用 PWA，否则缓存会让调试很难受
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

// 2. 配置 Next.js 本身的行为
const nextConfig: NextConfig = {
  // 这里可以放 Next.js 的其他配置
  // 注意：swcMinify 默认是 true，不需要显式写出来
  outputFileTracingIncludes: {
      // 键名是你的 API 路由路径
      '/api/lottery': ['./data/**/*'], 
  },
};

// 3. 导出包了一层 PWA 的配置
export default withPWA(nextConfig);
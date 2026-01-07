import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "欧气选号机 - 免费在线双色球随机选号工具",
  description: "一款基于加密级真随机算法的双色球选号工具...",
  manifest: "/manifest.json", // 显式链接 manifest
  themeColor: "#0f172a",      // 顶部状态栏颜色
  // iOS 专用配置
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "欧气选号",
  },
  // 视口配置，禁止用户缩放，像APP一样
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, 
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 预留 Google Adsense 代码的位置 */}
        {/* <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXX" crossOrigin="anonymous"></script> */}
      </head>
      <body className={inter.className}>
        {children}
        
        {/* 页脚：站长的版权声明，增加信任感 */}
        <footer className="w-full py-6 text-center text-slate-400 text-xs bg-slate-50 border-t border-slate-100">
          <p>© 2026 欧气选号机 | 仅供娱乐 | 理性购彩</p>
        </footer>
      </body>

      <GoogleAnalytics gaId="G-W2B5JCC7SN" />
    </html>
  );
}
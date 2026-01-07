import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  // 1. 标题优化：包含核心关键词 "双色球" "随机" "选号器"
  title: "欧气选号机 - 免费在线双色球随机选号工具 | 模拟摇奖",
  // 2. 描述优化：吸引用户点击的文案
  description: "一款基于加密级真随机算法的双色球选号工具。拒绝伪随机，在线模拟真实摇奖，自动同步最新开奖数据，助你吸取欧气，提升中奖概率。",
  // 3. 关键词：告诉爬虫你的核心业务
  keywords: "双色球, 选号器, 随机选号, 彩票工具, 模拟摇奖, 欧气生成器, 今天的幸运数字",
  // 4. 移动端优化
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  // 5. 作者/站长信息
  authors: [{ name: "Lucky Station Master" }],
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
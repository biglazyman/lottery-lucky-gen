import { NextResponse } from 'next/server';
// 直接导入 JSON 文件
// Next.js 会在构建时把这个 JSON 打包进去
import lotteryData from '@/data/lottery.json';

export async function GET() {
  try {
    // 直接返回静态数据，速度极快，0 延迟
    return NextResponse.json({
      success: true,
      data: lotteryData
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to load local data' 
    }, { status: 500 });
  }
}
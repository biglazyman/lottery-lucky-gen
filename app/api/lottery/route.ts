import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// 1. 强制动态模式，禁止 Next.js 构建时缓存静态 JSON
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'ssq';

    // 2. 明确映射文件名
    let fileName = 'lottery.json'; // 默认双色球
    if (type === 'dlt') {
        fileName = 'dlt.json';
    } else if (type === 'ssq') {
        fileName = 'lottery.json';
    } else {
        // 对于不支持 API 的彩种（如 Powerball），直接返回空数组，避免混淆
        return NextResponse.json({ success: true, data: [] });
    }

    const filePath = path.join(process.cwd(), 'data', fileName);

    // 3. 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return NextResponse.json({ success: true, data: [] }); // 文件不存在返回空，而不是报错
    }

    // 4. 读取文件
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);

    // 5. 返回响应，添加禁止缓存 Header
    return NextResponse.json({
      success: true,
      data,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to load data',
    }, { status: 500 });
  }
}
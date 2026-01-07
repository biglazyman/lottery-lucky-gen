import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 改动：issueCount=10，获取最近10期
    const targetUrl = 'http://www.cwl.gov.cn/cwl_admin/action/public/kj/zjInfo/ssq/issue?issueCount=10';
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'http://www.cwl.gov.cn/',
        'Accept': 'application/json'
      },
      next: { revalidate: 3600 } 
    });

    if (!response.ok) {
      throw new Error(`Upstream API failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result && data.result.length > 0) {
      // 返回一个数组
      const draws = data.result.map((item: any) => ({
        issue: item.code,
        date: item.date,
        week: item.week,
        red: item.red.split(',').map(Number),
        blue: Number(item.blue)
      }));

      return NextResponse.json({
        success: true,
        data: draws // 这里现在是数组了
      });
    }

    return NextResponse.json({ success: false, error: 'No data found' });

  } catch (error) {
    console.error('Fetch error:', error);
    // 兜底数据也改成数组
    return NextResponse.json({
      success: false, 
      isFallback: true,
      data: [
        { issue: '2026002(模拟)', date: '2026-01-09', week: '四', red: [2, 5, 8, 15, 20, 31], blue: 12 },
        { issue: '2026001(模拟)', date: '2026-01-07', week: '二', red: [1, 8, 12, 18, 22, 29], blue: 5 }
      ]
    });
  }
}
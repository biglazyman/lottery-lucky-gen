import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 这是一个公开的福彩官方接口，我们伪装成浏览器去请求
    // 注意：如果这个接口挂了，我们需要换一个备用的，但在开发阶段它通常很稳
    const targetUrl = 'http://www.cwl.gov.cn/cwl_admin/action/public/kj/zjInfo/ssq/issue?issueCount=1';
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'http://www.cwl.gov.cn/', // 必须带这个，否则会被拒绝
        'Accept': 'application/json'
      },
      next: { revalidate: 3600 } // Next.js 缓存：1小时更新一次，防止请求太频繁被封
    });

    if (!response.ok) {
      throw new Error(`Upstream API failed: ${response.status}`);
    }

    const data = await response.json();
    
    // 官方返回的数据格式比较乱，我们在后端把它清洗干净再给前端
    if (data.result && data.result.length > 0) {
      const latest = data.result[0];
      return NextResponse.json({
        success: true,
        data: {
          issue: latest.code, // 期号，如 "2024001"
          date: latest.date,  // 日期
          week: latest.week,  // 周几
          red: latest.red.split(',').map(Number), // "01,02..." -> [1, 2...]
          blue: Number(latest.blue) // "05" -> 5
        }
      });
    }

    return NextResponse.json({ success: false, error: 'No data found' });

  } catch (error) {
    console.error('Fetch error:', error);
    // 如果出错了，返回一个假的兜底数据，保证页面不崩
    return NextResponse.json({
      success: false, 
      isFallback: true,
      data: {
        issue: '2026001(模拟)',
        date: '2026-01-07',
        week: '二',
        red: [1, 8, 12, 18, 22, 29],
        blue: 16
      }
    });
  }
}
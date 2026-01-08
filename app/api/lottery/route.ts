import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

// 定义接口返回结构
type LotteryDraw = {
  issue: string;
  date: string;
  week: string;
  red: number[];
  blue: number;
};

export async function GET() {
  try {
    // ----------------------------------------------------------------
    // 爬虫目标：500彩票网 - 双色球开奖列表页
    // 这是一个静态 HTML 页面，反爬策略较宽松，且包含最近30期数据
    // ----------------------------------------------------------------
    const targetUrl = 'https://kaijiang.500.com/ssq.shtml';
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache'
    };

    // 1. 获取原始二进制数据 (ArrayBuffer)
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: headers,
      next: { revalidate: 60 } // 60秒缓存
    });

    if (!response.ok) {
      throw new Error(`500.com failed with status: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    
    // 2. 解码：500彩票网使用 GBK 编码，必须用 iconv-lite 转码，否则是乱码
    const html = iconv.decode(Buffer.from(buffer), 'gb2312');

    // 3. 加载 HTML 到 Cheerio
    const $ = cheerio.load(html);
    
    const draws: LotteryDraw[] = [];

    // 4. 解析表格
    // 500彩票网的表格 class 通常是 .kj_tablelist02
    // 我们遍历每一行数据
    $('table.kj_tablelist02 tr').each((i, el) => {
      // 跳过表头 (通常前2行是标题)
      if (i < 2) return;

      const $cols = $(el).find('td');
      
      // 确保这一行数据足够 (期号、红球、蓝球、日期等)
      if ($cols.length < 8) return;

      // 提取数据
      // 第1列：日期 (格式 2024-01-09)
      const dateRaw = $cols.eq(0).text().trim();
      
      // 第2列：期号 (格式 24004) -> 我们需要转成 2024004
      let issueRaw = $cols.eq(1).text().trim();
      // 如果期号是5位 (24004)，补全为 2024004
      if (issueRaw.length === 5) {
        issueRaw = '20' + issueRaw; 
      }

      // 第3-8列：红球 (class="ball_red")
      const reds: number[] = [];
      $cols.find('td.ball_red').each((_, ball) => {
        reds.push(Number($(ball).text().trim()));
      });

      // 蓝球 (class="ball_blue")
      const blue = Number($cols.find('td.ball_blue').text().trim());

      // 计算星期 (根据日期)
      const dateObj = new Date(dateRaw);
      const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const weekStr = weekMap[dateObj.getDay()];

      // 校验数据有效性
      if (issueRaw && reds.length === 6 && blue > 0) {
        draws.push({
          issue: issueRaw,
          date: dateRaw,
          week: weekStr,
          red: reds,
          blue: blue
        });
      }
    });

    // 5. 返回结果 (只取最近 20 期)
    if (draws.length > 0) {
      return NextResponse.json({
        success: true,
        data: draws.slice(0, 20)
      });
    }

    return NextResponse.json({ success: false, error: 'Parse Error: No draws found' }, { status: 500 });

  } catch (error) {
    console.error('Crawler Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to scrape data',
      debug: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
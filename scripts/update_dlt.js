const fs = require('fs');
const path = require('path');
const https = require('https');

// --- 配置 ---
const LOCAL_FILE_PATH = path.join(__dirname, '../data/dlt.json');
// 官方接口 URL
const API_HOST = 'webapi.sporttery.cn';
const API_PATH = '/gateway/lottery/getHistoryPageListV1.qry?gameNo=85&provinceId=0&pageSize=30&isVerify=1&pageNo=1';

console.log('🚀 正在获取大乐透(DLT)数据...');

const fetchJson = () => {
  return new Promise((resolve, reject) => {
    // 关键修复：添加 Headers 伪装成浏览器
    const options = {
      hostname: API_HOST,
      path: API_PATH,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://static.sporttery.cn/',
        'Origin': 'https://static.sporttery.cn',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
      }
    };

    const req = https.request(options, (res) => {
      // 如果状态码不对，直接报错
      if (res.statusCode !== 200) {
        reject(new Error(`请求被拒绝，状态码: ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          // 尝试解析 JSON
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          // 如果解析失败，把返回的前100个字符打印出来看看是什么
          console.error('❌ 返回内容不是 JSON，可能是 HTML 报错页面:');
          console.error(data.substring(0, 100));
          reject(new Error('JSON 解析失败'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

const main = async () => {
  try {
    const res = await fetchJson();
    
    // 检查结构
    if (!res || !res.value || !res.value.list) {
        throw new Error('API 结构变化，无法获取 list');
    }

    const rawList = res.value.list;
    const cleanData = rawList.map(item => {
        // 官方格式: "04 06 11 20 30 08 11" (前5个红，后2个蓝)
        // 这里的空格可能是一个或多个
        const parts = item.lotteryDrawResult.trim().split(/\s+/).map(Number);
        
        if (parts.length < 7) return null;

        const reds = parts.slice(0, 5);
        const blues = parts.slice(5, 7);

        // 解析日期
        const dateStr = item.lotteryDrawTime; // "2024-01-01"
        const d = new Date(dateStr);
        const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        
        // 防止日期解析错误
        const week = !isNaN(d.getTime()) ? weekMap[d.getDay()] : '';

        return {
            issue: item.lotteryDrawNum,
            date: dateStr,
            week: week,
            red: reds,
            blue: blues
        };
    }).filter(Boolean); // 过滤 null

    // 写入文件
    // 确保目录存在
    const dir = path.dirname(LOCAL_FILE_PATH);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(LOCAL_FILE_PATH, JSON.stringify(cleanData, null, 2));
    
    console.log(`🎉 大乐透数据更新成功！最新期号: ${cleanData[0].issue}`);
    console.log(`💾 已保存至: ${LOCAL_FILE_PATH}`);

  } catch (err) {
    console.error('❌ 更新失败:', err.message);
    process.exit(1);
  }
};

main();
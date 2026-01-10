const fs = require('fs');
const path = require('path');
const https = require('https');

// --- 配置 ---
const LOCAL_FILE_PATH = path.join(__dirname, '../data/dlt.json'); // 存为 dlt.json
// 体彩官方接口 (gameNo=85 是大乐透)
const REMOTE_API = 'https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=85&provinceId=0&pageSize=30&isVerify=1&pageNo=1';

console.log('🚀 正在获取大乐透(DLT)数据...');

const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
};

const main = async () => {
  try {
    const res = await fetchJson(REMOTE_API);
    
    // 检查结构
    if (!res || !res.value || !res.value.list) {
        throw new Error('API 结构变化，无法获取 list');
    }

    const rawList = res.value.list;
    const cleanData = rawList.map(item => {
        // 1. 解析号码
        // 官方格式: "04 06 11 20 30 08 11" (前5个红，后2个蓝)
        const parts = item.lotteryDrawResult.trim().split(/\s+/).map(Number);
        
        if (parts.length < 7) return null;

        const reds = parts.slice(0, 5);
        const blues = parts.slice(5, 7);

        // 2. 解析日期
        const dateStr = item.lotteryDrawTime; // "2024-01-01"
        const d = new Date(dateStr);
        const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const week = weekMap[d.getDay()];

        return {
            issue: item.lotteryDrawNum,
            date: dateStr,
            week: week,
            red: reds,
            blue: blues
        };
    }).filter(Boolean);

    // 写入文件
    fs.writeFileSync(LOCAL_FILE_PATH, JSON.stringify(cleanData, null, 2));
    
    console.log(`🎉 大乐透数据更新成功！最新期号: ${cleanData[0].issue}`);
    console.log(`💾 已保存至: ${LOCAL_FILE_PATH}`);

  } catch (err) {
    console.error('❌ 更新失败:', err.message);
  }
};

main();
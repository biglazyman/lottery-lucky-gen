const fs = require('fs');
const path = require('path');
const https = require('https');

// --- 配置 ---
const DATA_DIR = path.join(__dirname, '../data');

// 500彩票网 XML 源 (极其稳定，包含最近 ~100 期)
const SOURCES = {
  ssq: {
    name: '双色球',
    url: 'https://kaijiang.500.com/static/info/kaijiang/xml/ssq/list.xml',
    file: path.join(DATA_DIR, 'lottery.json'),
    type: 'ssq'
  },
  dlt: {
    name: '大乐透',
    url: 'https://kaijiang.500.com/static/info/kaijiang/xml/dlt/list.xml',
    file: path.join(DATA_DIR, 'dlt.json'),
    type: 'dlt'
  }
};

console.log('🚀 开始全量初始化历史数据...');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 通用抓取函数
const fetchAndSave = (key) => {
  return new Promise((resolve, reject) => {
    const cfg = SOURCES[key];
    console.log(`\n📡 正在获取 [${cfg.name}] 历史数据...`);

    const options = {
      headers: { 'User-Agent': 'Mozilla/5.0' } // 简单伪装
    };

    https.get(cfg.url, options, (res) => {
      let xmlData = '';
      res.on('data', c => xmlData += c);
      res.on('end', () => {
        try {
          // 正则提取 XML (比引入 xml2js 库更轻量)
          // 格式: <row expect="24005" opencode="05,08,12..." opentime="2024-01-10 ..."/>
          const regex = /<row expect="(\d+)" opencode="([\d,]+)(?:\+|\|)([\d,]+)" opentime="([^"]+)"/g;
          
          const cleanData = [];
          let match;

          while ((match = regex.exec(xmlData)) !== null) {
              let issue = match[1];      // 期号 (如 24005)
              const redStr = match[2];
              const blueStr = match[3];
              const openTime = match[4];

              // --- 格式化期号 ---
              // 500网的双色球通常是 24005 (短年份)，大乐透也是 24005
              // 我们统一转为 2024005 (4位年份)
              if (issue.length === 5) {
                issue = '20' + issue;
              }

              const reds = redStr.split(',').map(Number);
              const blues = blueStr.split(',').map(Number);
              
              const dateStr = openTime.split(' ')[0];
              
              // 计算星期
              const d = new Date(dateStr);
              const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
              const week = !isNaN(d.getTime()) ? weekMap[d.getDay()] : '';

              cleanData.push({
                  issue,
                  date: dateStr,
                  week,
                  red: reds,
                  blue: blues
              });
          }

          if (cleanData.length === 0) {
              console.error(`❌ [${cfg.name}] 未提取到数据，可能是 XML 格式变更。`);
              resolve();
              return;
          }

          // 按期号降序
          cleanData.sort((a, b) => parseInt(b.issue) - parseInt(a.issue));

          // 只保留最近 50 期
          const finalData = cleanData.slice(0, 50);

          fs.writeFileSync(cfg.file, JSON.stringify(finalData, null, 2));
          console.log(`✅ [${cfg.name}] 初始化成功！最新期号: ${finalData[0].issue}`);
          resolve();

        } catch (e) {
          console.error(`❌ [${cfg.name}] 解析失败:`, e.message);
          resolve(); // 不阻断其他任务
        }
      });
    }).on('error', (e) => {
        console.error(`❌ [${cfg.name}] 网络错误:`, e.message);
        resolve();
    });
  });
};

const main = async () => {
  await fetchAndSave('ssq');
  await fetchAndSave('dlt');
  console.log('\n🎉 所有数据初始化完成！');
};

main();
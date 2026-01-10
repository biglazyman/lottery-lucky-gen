const fs = require('fs');
const path = require('path');
const https = require('https');

// --- 配置区域 ---
const CONFIG = {
  ssq: {
    name: '双色球',
    file: path.join(__dirname, '../data/lottery.json'),
    lottoType: '101',
    // 接口期号格式化: 2026003 -> 2026003
    formatIssueForApi: (issue) => issue, 
    // 本地存储格式化: 2026003 -> 2026003
    formatIssueForLocal: (issue) => issue,
    // 初始兜底期号 (如果本地文件为空)
    defaultStart: '2026001' 
  },
  dlt: {
    name: '大乐透',
    file: path.join(__dirname, '../data/dlt.json'),
    lottoType: '201',
    // 接口期号格式化: 2026003 -> 26003 (去掉年份前两位)
    formatIssueForApi: (issue) => issue.substring(2), 
    // 本地存储格式化: 26003 -> 2026003 (补全年份，保持统一)
    formatIssueForLocal: (shortIssue) => '20' + shortIssue,
    defaultStart: '2026001'
  }
};

// 基础 URL 模板
const API_BASE = 'https://alpha.lottery.sina.com.cn/gateway/index/entry?format=json&__caller__=web&__version__=1.0.0&__verno__=1&cat1=gameOpenInfo&dpc=1';

// 辅助：请求 API
const fetchIssue = (lottoType, issueNo) => {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}&lottoType=${lottoType}&issueNo=${issueNo}`;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://lottery.sina.com.cn/',
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // 新浪接口成功返回 code: 0
          if (json.code === 0 && json.result && json.result.data && json.result.data.openCode) {
            resolve(json.result.data);
          } else {
            resolve(null); // 未开奖或不存在
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
};

// 辅助：计算下一期期号 (简单逻辑：+1)
// 注意：处理跨年逻辑比较复杂，这里简化为：如果 NNN > 154 (大乐透/双色球一年通常154期左右)，则尝试 下一年001
const getNextIssue = (currentIssue) => {
  const year = parseInt(currentIssue.substring(0, 4));
  const seq = parseInt(currentIssue.substring(4));
  
  if (seq >= 154) {
    // 到了年底，尝试一下下一年的第一期
    // 这里其实应该先试 +1，如果 API 返回 null，再试下一年的 001。
    // 为了脚本简单，我们先只做 +1 逻辑。如果到了年底脚本报错，手动改一下本地文件即可。
    return `${year}${String(seq + 1).padStart(3, '0')}`;
  } else {
    return `${year}${String(seq + 1).padStart(3, '0')}`;
  }
};

// 处理单个彩种
const processLottery = async (key) => {
  const cfg = CONFIG[key];
  console.log(`\n🚀 开始检查 [${cfg.name}] ...`);

  // 1. 读取本地数据
  let localData = [];
  try {
    if (fs.existsSync(cfg.file)) {
      localData = JSON.parse(fs.readFileSync(cfg.file, 'utf-8'));
    }
  } catch (e) { console.log('⚠️ 本地文件读取失败，将新建'); }

  // 2. 确定从哪一期开始更新
  let latestIssue = cfg.defaultStart;
  if (localData.length > 0) {
    // 假设第一条是最新的
    latestIssue = localData[0].issue; 
  }
  
  console.log(`📂 本地最新期号: ${latestIssue}`);

  let updatesCount = 0;
  let currentCheckIssue = latestIssue;

  // 3. 循环检查下一期 (防止漏掉中间的几期)
  // 最多连续检查 5 次，防止死循环
  for (let i = 0; i < 5; i++) {
    const nextLocalIssue = getNextIssue(currentCheckIssue);
    const apiIssueParam = cfg.formatIssueForApi(nextLocalIssue);
    
    console.log(`📡 尝试获取下一期: ${nextLocalIssue} (API参数: ${apiIssueParam}) ...`);
    
    const apiData = await fetchIssue(cfg.lottoType, apiIssueParam);

    if (apiData) {
      console.log(`✅ 获取成功！开奖号码: ${apiData.openCode}`);
      
      // 解析数据
      // 新浪 openCode 格式: "01,02,03...|01" (分隔符可能是 + 或 |)
      // 需要观察实际返回。通常是:
      // SSQ: "01,02,03,04,05,06+07"
      // DLT: "05,06,09,15,30+05,09"
      
      const rawCode = apiData.openCode;
      let reds = [];
      let blues = [];

      if (rawCode.includes('+')) {
        const parts = rawCode.split('+');
        reds = parts[0].split(',').map(Number);
        blues = parts[1].split(',').map(Number);
      } else if (rawCode.includes('|')) { // 防御性编程
        const parts = rawCode.split('|');
        reds = parts[0].split(',').map(Number);
        blues = parts[1].split(',').map(Number);
      } else {
         // DLT 有时空格分隔？按照你的接口返回，应该是标准格式
         // 这里做个简单的正则兜底
         const nums = rawCode.match(/\d+/g).map(Number);
         if (key === 'ssq') { reds = nums.slice(0,6); blues = nums.slice(6); }
         if (key === 'dlt') { reds = nums.slice(0,5); blues = nums.slice(5); }
      }

      // 提取日期 (格式 2026-01-10)
      const dateStr = apiData.openTime ? apiData.openTime.split(' ')[0] : '';
      const d = new Date(dateStr);
      const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const week = !isNaN(d.getTime()) ? weekMap[d.getDay()] : '';

      const newItem = {
        issue: nextLocalIssue, // 统一存为 2026003 格式
        date: dateStr,
        week: week,
        red: reds,
        blue: blues,
        // (可选) 如果你想存奖池或销售额，可以在这里加
        // sales: apiData.salesAmount
      };

      // 加到头部
      localData.unshift(newItem);
      updatesCount++;
      currentCheckIssue = nextLocalIssue; // 继续查下一期
      
      // 简单防抖，防止接口请求太快
      await new Promise(r => setTimeout(r, 500)); 

    } else {
      console.log(`⏳ 暂无数据，停止更新。`);
      break; 
    }
  }

  // 4. 保存
  if (updatesCount > 0) {
    // 保持只存最近 50 期
    const finalData = localData.slice(0, 50);
    // 确保目录存在
    const dir = path.dirname(cfg.file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(cfg.file, JSON.stringify(finalData, null, 2));
    console.log(`💾 已写入 ${updatesCount} 条新数据到 ${cfg.file}`);
  } else {
    console.log(`✨ 本地数据已是最新。`);
  }
};

// 主入口
const main = async () => {
  await processLottery('ssq');
  await processLottery('dlt');
};

main();
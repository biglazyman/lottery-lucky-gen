const fs = require('fs');
const path = require('path');
const https = require('https');

// --- 配置 ---
const LOCAL_FILE_PATH = path.join(__dirname, '../data/lottery.json');
const REMOTE_URL = 'https://raw.gitcode.com/chxii/lottery_results/raw/master/lottery_results.json';

console.log('🚀 正在检查彩票数据更新...');

// 辅助函数：发送 HTTPS 请求
const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`请求失败，状态码: ${res.statusCode}`));
        return;
      }
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(rawData));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (e) => reject(e));
  });
};

const main = async () => {
  try {
    // 1. 获取远程最新数据
    console.log('📡 正在请求远程数据 API...');
    const remoteData = await fetchJson(REMOTE_URL);
    
    if (!Array.isArray(remoteData) || remoteData.length === 0) {
      throw new Error('远程数据格式错误或为空');
    }
    
    // 按【期号】降序排序
    // 安全排序：防止 '期号' 字段缺失导致 NaN
    remoteData.sort((a, b) => {
      const issueA = parseInt(a['期号'] || 0);
      const issueB = parseInt(b['期号'] || 0);
      return issueB - issueA;
    });

    const latestRemote = remoteData[0];
    const latestRemoteIssue = latestRemote['期号'];
    const latestRemoteDate = latestRemote['开奖日期'];

    console.log(`🌐 远程最新期号: ${latestRemoteIssue} (${latestRemoteDate})`);

    // 2. 检查本地数据
    let shouldUpdate = true;
    
    if (fs.existsSync(LOCAL_FILE_PATH)) {
      try {
        const localContent = fs.readFileSync(LOCAL_FILE_PATH, 'utf-8');
        const localData = JSON.parse(localContent);
        
        if (Array.isArray(localData) && localData.length > 0) {
          const latestLocal = localData[0];
          const latestLocalIssue = latestLocal.issue;
          
          console.log(`📂 本地最新期号: ${latestLocalIssue}`);

          if (latestRemoteIssue == latestLocalIssue) {
            shouldUpdate = false;
            console.log('✅ 数据已是最新，无需更新。');
          } else {
            console.log('⚡ 发现新的一期数据，准备更新...');
          }
        }
      } catch (err) {
        console.log('⚠️ 本地文件解析失败，准备重新下载。');
      }
    } else {
      console.log('📂 本地暂无数据，准备首次下载...');
    }

    // 3. 执行更新
    if (shouldUpdate) {
      // 数据清洗/转换
      const cleanData = remoteData.map(item => {
        // --- 🛡️ 安全检查区域 ---
        
        // 1. 如果整条数据为空，直接返回 null (稍后过滤)
        if (!item) return null;

        // 2. 获取原始日期，如果没有则给空字符串，防止 match 报错
        const dateRaw = item['开奖日期'] || ''; 
        
        // 3. 安全获取红蓝球 (使用可选链 ?. 防止开奖号码对象不存在)
        const redRaw = item['开奖号码']?.['红球'];
        const blueRaw = item['开奖号码']?.['蓝球'];

        // 如果关键数据缺失，视为无效数据
        if (!dateRaw || !redRaw || !item['期号']) {
            return null;
        }
        // --- 🛡️ 安全检查结束 ---

        // 解析日期: "2026-01-06(二)" -> "2026-01-06"
        const dateMatch = dateRaw.match(/^(\d{4}-\d{2}-\d{2})/);
        const dateStr = dateMatch ? dateMatch[1] : '';

        // 格式化号码
        const reds = Array.isArray(redRaw) ? redRaw.map(Number) : [];
        const blue = parseInt(blueRaw, 10);

        // 自动计算星期
        let week = '';
        if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                week = weekMap[d.getDay()];
            }
        }

        return {
          issue: item['期号'],
          date: dateStr,
          week: week,
          red: reds,
          blue: blue
        };
      })
      // 4. 过滤掉 null 的项，以及那些红球数量不对的脏数据
      .filter(item => item !== null && item.issue && item.red.length === 6);

      // 只保留最近 50 期
      const finalData = cleanData.slice(0, 50);

      fs.writeFileSync(LOCAL_FILE_PATH, JSON.stringify(finalData, null, 2));
      console.log(`🎉 更新成功！已写入 ${finalData.length} 期数据到 ${LOCAL_FILE_PATH}`);
    }

  } catch (error) {
    console.error('❌ 更新失败:', error.message);
    process.exit(1);
  }
};

main();
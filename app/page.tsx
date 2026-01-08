'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Sparkles, Trophy, Loader2, Calendar, Clock, AlertCircle, Zap, Timer, UserCircle2, WifiOff } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- 类型定义 ---
type DrawData = {
  issue: string;
  red: number[];
  blue: number;
  date: string;
  week: string;
};

type PrizeLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type HistoryItem = {
  red: number[];
  blue: number;
  date: string;
  prizeLevel: PrizeLevel;
  winIssue?: string;
  forIssue: string;
};

type LinkedWinner = {
  user: string;
  prizeLevel: 1 | 2;
};

const FUN_NAMES = [
  "皮卡丘", "妙蛙种子", "小火龙", "杰尼龟", "胖丁", "可达鸭", "卡比兽", "超梦",
  "双色球大师", "红蓝球球", "欧气训练家", "幸运红球", "蓝球猎手",
  "锦鲤本鲤", "欧皇附体", "发财猫", "旺财", "好运来"
];

export default function Home() {
  const [redBalls, setRedBalls] = useState<number[]>([0,0,0,0,0,0]);
  const [blueBall, setBlueBall] = useState<number>(0);
  const [isRolling, setIsRolling] = useState(false);
  
  // 核心数据状态
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [drawsList, setDrawsList] = useState<DrawData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isError, setIsError] = useState(false); // 新增：错误状态

  const [winnersMap, setWinnersMap] = useState<Record<string, LinkedWinner>>({});
  const [nextIssueInfo, setNextIssueInfo] = useState({ issue: '---', deadline: '---' });
  const [currentTime, setCurrentTime] = useState<string>('');
  const [username, setUsername] = useState<string>('加载中...');

  const rollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. 用户身份
    let storedName = localStorage.getItem('lottery-username');
    if (!storedName) {
      const randomName = FUN_NAMES[Math.floor(Math.random() * FUN_NAMES.length)];
      const suffix = Math.floor(Math.random() * 999) + 1;
      storedName = `${randomName} No.${suffix}`;
      localStorage.setItem('lottery-username', storedName);
    }
    setUsername(storedName);

    // 2. 时钟
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    // 3. 加载本地历史
    const saved = localStorage.getItem('lottery-history');
    if (saved) setHistory(JSON.parse(saved));

    // 4. 获取真实数据
    fetch('/api/lottery')
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(res => {
        if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setDrawsList(res.data);
          generateFakeWinners(res.data);
          calculateNextIssueReal(res.data[0]); // 使用严谨计算
        } else {
          throw new Error('Data format error or empty');
        }
      })
      .catch(err => {
        console.error('API Error:', err);
        setIsError(true); // 标记错误，不再显示假数据
      })
      .finally(() => setIsLoadingData(false));

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (history.length > 0) localStorage.setItem('lottery-history', JSON.stringify(history));
  }, [history]);

  // --- 严谨的下一期计算逻辑 ---
  // 双色球开奖时间：周二、四、日 21:15
  // 销售截止时间：当天 20:00
  const calculateNextIssueReal = (latestDraw: DrawData) => {
    if (!latestDraw) return;
    
    // 1. 推算期号 (简单+1，处理跨年需更复杂逻辑，此处暂用+1)
    // 真实场景通常需要后端给nextIssue，如果没有，我们只能基于最新期号+1
    const currentIssueNum = parseInt(latestDraw.issue);
    const nextIssue = (currentIssueNum + 1).toString();

    // 2. 推算截止时间
    const now = new Date();
    const currentDay = now.getDay(); // 0-6 (Sun-Sat)
    const currentHour = now.getHours();

    // 定义开奖日：周二(2)、周四(4)、周日(0)
    // 如果今天是开奖日，且还没到20:00，那下一期就是【今天】
    let daysToAdd = 0;
    const isDrawDay = [0, 2, 4].includes(currentDay);
    
    if (isDrawDay && currentHour < 20) {
      daysToAdd = 0; // 就是今天
    } else {
      // 找下一个开奖日
      // Sun(0) -> Tue(2) (+2)
      // Mon(1) -> Tue(2) (+1)
      // Tue(2) -> Thu(4) (+2)
      // Wed(3) -> Thu(4) (+1)
      // Thu(4) -> Sun(0) (+3)
      // Fri(5) -> Sun(0) (+2)
      // Sat(6) -> Sun(0) (+1)
      if (currentDay === 0) daysToAdd = 2;
      else if (currentDay === 1) daysToAdd = 1;
      else if (currentDay === 2) daysToAdd = 2;
      else if (currentDay === 3) daysToAdd = 1;
      else if (currentDay === 4) daysToAdd = 3;
      else if (currentDay === 5) daysToAdd = 2;
      else if (currentDay === 6) daysToAdd = 1;
    }

    const nextDate = new Date();
    nextDate.setDate(now.getDate() + daysToAdd);
    
    const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const deadlineStr = `${weekMap[nextDate.getDay()]} 20:00`;

    setNextIssueInfo({ issue: nextIssue, deadline: deadlineStr });
  };

  const generateFakeWinners = (draws: DrawData[]) => {
    const map: Record<string, LinkedWinner> = {};
    // 仅基于真实数据生成趣味喜报
    const assignWinner = (idx: number, level: 1 | 2) => {
       if (idx < draws.length) {
         const randomName = FUN_NAMES[Math.floor(Math.random() * FUN_NAMES.length)];
         const suffix = Math.floor(Math.random() * 999) + 1; 
         map[draws[idx].issue] = { user: `${randomName} No.${suffix}`, prizeLevel: level };
       }
    };
    assignWinner(0, 1);
    assignWinner(2, 2);
    assignWinner(4, 1);
    setWinnersMap(map);
  };

  const getTrueRandom = (min: number, max: number, exclude: number[] = []) => {
    const range = max - min + 1;
    const array = new Uint32Array(1);
    let randomNum;
    do {
      window.crypto.getRandomValues(array);
      randomNum = min + (array[0] % range);
    } while (exclude.includes(randomNum));
    return randomNum;
  };

  const calculatePrize = (red: number[], blue: number): PrizeLevel => {
    if (drawsList.length === 0) return 0;
    const latest = drawsList[0];
    const redHits = red.filter(r => latest.red.includes(r)).length;
    const blueHit = blue === latest.blue;
    if (redHits === 6 && blueHit) return 1;
    if (redHits === 6 && !blueHit) return 2;
    if (redHits === 5 && blueHit) return 3;
    if ((redHits === 5 && !blueHit) || (redHits === 4 && blueHit)) return 4;
    if ((redHits === 4 && !blueHit) || (redHits === 3 && blueHit)) return 5;
    if (blueHit) return 6;
    return 0;
  };

  const startRolling = () => {
    if (isRolling) return;
    setIsRolling(true);
    rollIntervalRef.current = setInterval(() => {
       setRedBalls(Array(6).fill(0).map(() => Math.floor(Math.random() * 33) + 1));
       setBlueBall(Math.floor(Math.random() * 16) + 1);
    }, 50);
    setTimeout(() => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      const finalReds: number[] = [];
      while (finalReds.length < 6) {
        const num = getTrueRandom(1, 33, finalReds);
        finalReds.push(num);
      }
      finalReds.sort((a, b) => a - b);
      const finalBlue = getTrueRandom(1, 16);
      setRedBalls(finalReds);
      setBlueBall(finalBlue);
      setIsRolling(false);
      const prizeLevel = calculatePrize(finalReds, finalBlue);
      if (prizeLevel > 0) triggerConfetti();
      const newRecord: HistoryItem = {
        red: finalReds, blue: finalBlue, date: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        prizeLevel, winIssue: prizeLevel > 0 && drawsList.length > 0 ? drawsList[0].issue : undefined, forIssue: nextIssueInfo.issue
      };
      setHistory(prev => [newRecord, ...prev].slice(0, 50));
    }, 800);
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#ef4444', '#3b82f6', '#fbbf24'] });
  };

  const getPrizeBadge = (level: PrizeLevel) => {
    switch (level) {
      case 1: return <span className="text-white bg-red-500 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">一等奖</span>;
      case 2: return <span className="text-white bg-orange-500 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">二等奖</span>;
      case 3: return <span className="text-yellow-700 bg-yellow-100 border border-yellow-200 px-2 py-0.5 rounded-full text-[10px] font-bold">三等奖</span>;
      case 4: return <span className="text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold">四等奖</span>;
      case 5: return <span className="text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full text-[10px]">五等奖</span>;
      case 6: return <span className="text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full text-[10px]">六等奖</span>;
      default: return null;
    }
  };

  return (
    <main className="fixed inset-0 w-full bg-slate-50 flex flex-col items-center justify-center overflow-hidden font-sans text-slate-900">
      
      <div className="w-full max-w-[1300px] h-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-6">
        
        {/* === 左侧栏：官方历史 === */}
        <aside className="hidden lg:flex flex-col h-full overflow-hidden order-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-blue-500" />
                 <h3 className="text-slate-700 font-bold text-sm">官方开奖</h3>
               </div>
               <span className="text-[10px] text-slate-400">数据源: 福彩中心</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
              {/* 加载中状态 */}
              {isLoadingData && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs bg-white/80 z-10">
                   <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-500"/>
                   正在同步官方数据...
                 </div>
              )}
              
              {/* 错误状态 (没有假数据了) */}
              {isError && !isLoadingData && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs bg-white">
                  <WifiOff className="w-8 h-8 mb-2 text-slate-300"/>
                  <p>无法连接福彩官网</p>
                  <p className="scale-75 opacity-70 mt-1">请检查网络或刷新</p>
                </div>
              )}

              {drawsList.map((draw, idx) => {
                const winner = winnersMap[draw.issue];
                return (
                  <div key={idx} 
                    className={`p-3 transition-all duration-300 relative overflow-hidden
                      ${winner 
                        ? 'bg-gradient-to-r from-yellow-50 via-white to-white border-l-4 border-yellow-400 opacity-100' 
                        : 'bg-white grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                      }`}
                  >
                     {winner && (
                       <div className="absolute top-0 right-0 z-10">
                         <div className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold shadow-sm flex items-center gap-1">
                           <Trophy className="w-3 h-3 text-yellow-300" />
                           {winner.user} 中{winner.prizeLevel === 1 ? '一等奖' : '二等奖'}
                         </div>
                       </div>
                     )}

                     <div className="flex justify-between items-center mb-1.5 mt-1">
                        <span className={`text-xs font-bold ${winner ? 'text-slate-800' : 'text-slate-500'}`}>第 {draw.issue} 期</span>
                        <span className="text-[10px] text-slate-300">{draw.date}</span>
                     </div>
                     <div className="flex gap-1 text-sm font-mono font-bold">
                        {draw.red.map((n, i) => (
                          <span key={i} className={winner ? 'text-red-500' : 'text-slate-400'}>{n.toString().padStart(2, '0')}</span>
                        ))}
                        <span className={winner ? 'text-blue-500' : 'text-slate-400'}>{draw.blue.toString().padStart(2, '0')}</span>
                     </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* === 中间栏：主机 === */}
        <section className="flex flex-col h-full min-h-0 overflow-hidden order-2 relative">
          
          {/* Logo */}
          <div className="shrink-0 mb-4 text-center cursor-pointer select-none group" onClick={triggerConfetti}>
             <div className="relative inline-block">
                <div className="relative flex items-center justify-center gap-2">
                   <Sparkles className="w-8 h-8 text-yellow-500 animate-bounce" style={{ animationDuration: '3s' }} />
                   <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tighter drop-shadow-sm">
                     欧气选号机
                   </h1>
                   <Zap className="w-6 h-6 text-blue-500 rotate-12 group-hover:rotate-45 transition-transform" />
                </div>
             </div>
          </div>

          {/* 信息看板 */}
          <div className="shrink-0 w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-4 text-white shadow-xl flex justify-between items-center relative overflow-hidden border border-slate-700">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
             
             <div className="z-10">
               <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                 <RefreshCw className="w-3 h-3 animate-spin"/> 待开奖
               </div>
               <div className="text-2xl font-black tracking-tight text-white">
                 第 <span className="text-yellow-400">{nextIssueInfo.issue}</span> 期
               </div>
             </div>

             <div className="z-10 flex flex-col items-center justify-center">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Current Time</div>
                <div className="text-xl font-mono font-bold text-slate-200 tabular-nums tracking-widest flex items-center gap-2">
                  <Timer className="w-4 h-4 text-slate-500" />
                  {currentTime}
                </div>
             </div>

             <div className="z-10 text-right">
               <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-end gap-1">
                 <Clock className="w-3 h-3"/> 截止
               </div>
               <div className="text-base font-bold text-white flex items-center gap-1">
                 {nextIssueInfo.deadline}
                 <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />
               </div>
             </div>
          </div>

          {/* 机器主体 */}
          <div className="shrink-0 bg-white p-4 sm:p-6 rounded-[2rem] shadow-lg border-4 border-slate-100 w-full mb-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-100/50 to-orange-100/50 rounded-full -mr-20 -mt-20 z-0"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-full -ml-16 -mb-16 z-0"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6 min-h-[50px]">
                {redBalls.map((num, idx) => (
                  <div key={`red-${idx}`} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-2xl font-bold shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.2)] transition-all duration-100 ${isRolling ? 'scale-110 bg-red-400 blur-[0.5px]' : 'scale-100 bg-gradient-to-br from-red-500 to-red-600'} text-white ring-4 ring-red-50`}>
                    {num === 0 ? '?' : num.toString().padStart(2, '0')}
                  </div>
                ))}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-2xl font-bold shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.2)] ml-2 transition-all duration-100 ${isRolling ? 'scale-110 bg-blue-400 blur-[0.5px]' : 'scale-100 bg-gradient-to-br from-blue-500 to-blue-600'} text-white ring-4 ring-blue-50`}>
                  {blueBall === 0 ? '?' : blueBall.toString().padStart(2, '0')}
                </div>
              </div>
              <button onClick={startRolling} disabled={isRolling} className="relative w-full sm:w-56 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 disabled:scale-100 disabled:opacity-80 transition-all overflow-hidden flex items-center justify-center gap-3 group">
                 <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-shine" />
                 <RefreshCw className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
                 {isRolling ? '注入欧气' : '立即随机'}
              </button>
            </div>
          </div>

          {/* 我的记录区 (防止溢出) */}
          <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-100 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2">
                 <UserCircle2 className="w-4 h-4 text-purple-500" />
                 {/* 身份展示 */}
                 <span className="text-slate-700 font-bold text-sm truncate max-w-[150px]">{username}</span>
               </div>
               {history.length > 0 && <button onClick={() => {setHistory([]); localStorage.removeItem('lottery-history')}} className="text-xs text-red-400 hover:text-red-600">清空</button>}
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {history.length === 0 && (
                <div className="text-center text-slate-300 text-sm py-10">暂无记录</div>
              )}
              {history.map((item, idx) => (
                <div key={idx} className={`px-5 py-3 flex justify-between items-center hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0`}>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">第{item.forIssue}期</span>
                       <span className="text-[10px] text-slate-300">{item.date}</span>
                    </div>
                    <div className="flex gap-2 text-base font-mono tracking-tight font-bold">
                      {item.red.map(n => <span key={n} className="text-slate-700">{n.toString().padStart(2, '0')}</span>)}
                      <span className="text-slate-200">|</span>
                      <span className="text-blue-500">{item.blue.toString().padStart(2, '0')}</span>
                    </div>
                    {item.prizeLevel > 0 && (
                       <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-yellow-500"/>
                          <span>参考上期中</span>
                          {getPrizeBadge(item.prizeLevel)}
                       </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* === 右侧栏：广告 === */}
        <aside className="hidden lg:flex flex-col h-full order-3 overflow-hidden">
          <div className="h-full bg-slate-100 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
             <span className="text-sm font-bold">AD SPACE</span>
             <span className="text-xs">Full Height Skyscraper</span>
             <span className="text-[10px] mt-2">Google Adsense</span>
          </div>
        </aside>
      </div>

      <style jsx global>{`
        @keyframes shine { 100% { left: 125%; } }
        .animate-shine { animation: shine 1s; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
      `}</style>
    </main>
  );
}
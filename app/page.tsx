'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Sparkles, Loader2, Calendar, Clock, AlertCircle, Zap, Timer, History, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- 类型定义 ---
type DrawData = {
  issue: string;
  date: string;
  week: string;
  red: number[];
  blue: number;
};

// 奖级: 1=一等奖 ... 6=六等奖
type PrizeLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type HistoryItem = {
  red: number[];
  blue: number;
  date: string;
  prizeLevel: PrizeLevel; // 仅作为参考：该号码如果买上一期能中多少
  winIssue?: string;
  forIssue: string; // 该号码是为哪一期生成的
};

export default function Home() {
  // 核心选号状态
  const [redBalls, setRedBalls] = useState<number[]>([0,0,0,0,0,0]);
  const [blueBall, setBlueBall] = useState<number>(0);
  const [isRolling, setIsRolling] = useState(false);
  
  // 数据状态
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [drawsList, setDrawsList] = useState<DrawData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // 下一期信息
  const [nextIssueInfo, setNextIssueInfo] = useState({ issue: '---', deadline: '---' });
  const [currentTime, setCurrentTime] = useState<string>('');
  
  const rollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. 启动时钟
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    // 2. 加载本地历史
    const saved = localStorage.getItem('lottery-history');
    if (saved) setHistory(JSON.parse(saved));

    // 3. 获取真实数据
    fetch('/api/lottery')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data && Array.isArray(res.data)) {
          setDrawsList(res.data);
          calculateNextIssueReal(res.data[0]);
        }
      })
      .catch(err => console.error('API Error:', err))
      .finally(() => setIsLoadingData(false));

    return () => clearInterval(timer);
  }, []);

  // 同步历史到本地存储
  useEffect(() => {
    if (history.length > 0) localStorage.setItem('lottery-history', JSON.stringify(history));
  }, [history]);

  // 计算下一期信息
  const calculateNextIssueReal = (latestDraw: DrawData) => {
    if (!latestDraw) return;
    
    // 简单推算下一期 (注意：跨年需特殊处理，此处简化为+1)
    const currentIssueNum = parseInt(latestDraw.issue);
    const nextIssue = (currentIssueNum + 1).toString();

    // 推算截止时间
    const now = new Date();
    const currentDay = now.getDay(); // 0-6 (Sun-Sat)
    const currentHour = now.getHours();

    // 开奖日：周二(2)、周四(4)、周日(0)
    let daysToAdd = 0;
    const isDrawDay = [0, 2, 4].includes(currentDay);
    
    // 如果今天是开奖日且未过20:00，则是今天，否则找下一个开奖日
    if (isDrawDay && currentHour < 20) {
      daysToAdd = 0; 
    } else {
      if (currentDay === 0) daysToAdd = 2; // Sun -> Tue
      else if (currentDay === 1) daysToAdd = 1; // Mon -> Tue
      else if (currentDay === 2) daysToAdd = 2; // Tue -> Thu
      else if (currentDay === 3) daysToAdd = 1; // Wed -> Thu
      else if (currentDay === 4) daysToAdd = 3; // Thu -> Sun
      else if (currentDay === 5) daysToAdd = 2; // Fri -> Sun
      else if (currentDay === 6) daysToAdd = 1; // Sat -> Sun
    }

    const nextDate = new Date();
    nextDate.setDate(now.getDate() + daysToAdd);
    
    const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const deadlineStr = `${weekMap[nextDate.getDay()]} 20:00`;

    setNextIssueInfo({ issue: nextIssue, deadline: deadlineStr });
  };

  // 真随机算法
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

  // 计算参考奖级 (仅用于显示“若买上期可中XXX”)
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
      // 只有中大奖才撒花，增加稀缺感
      if (prizeLevel > 0 && prizeLevel <= 3) triggerConfetti();

      const newRecord: HistoryItem = {
        red: finalReds, 
        blue: finalBlue, 
        date: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        prizeLevel, 
        winIssue: prizeLevel > 0 && drawsList.length > 0 ? drawsList[0].issue : undefined, 
        forIssue: nextIssueInfo.issue
      };

      setHistory(prev => [newRecord, ...prev].slice(0, 50));
    }, 800);
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#ef4444', '#3b82f6', '#fbbf24'] });
  };

  // 简单的奖级文本
  const getPrizeText = (level: PrizeLevel) => {
    const map = ['', '一等奖', '二等奖', '三等奖', '四等奖', '五等奖', '六等奖'];
    return map[level] || '';
  };

  return (
    <main className="fixed inset-0 w-full bg-slate-50 flex flex-col items-center justify-center overflow-hidden font-sans text-slate-900">
      
      {/* 核心容器 */}
      <div className="w-full max-w-[1300px] h-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-6">
        
        {/* === 左侧栏：官方历史 (纯净版) === */}
        <aside className="hidden lg:flex flex-col h-full overflow-hidden order-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-blue-500" />
                 <h3 className="text-slate-700 font-bold text-sm">官方历史数据</h3>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoadingData ? (
                 <div className="p-8 text-center text-slate-400 text-xs"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/>数据同步中...</div>
              ) : drawsList.map((draw, idx) => (
                <div key={idx} className="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                   <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">第 {draw.issue} 期</span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">{draw.week}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{draw.date}</span>
                   </div>
                   <div className="flex gap-1 text-sm font-mono font-bold">
                      {draw.red.map((n, i) => (
                        <span key={i} className="text-red-500">{n.toString().padStart(2, '0')}</span>
                      ))}
                      <span className="text-blue-500">{draw.blue.toString().padStart(2, '0')}</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* === 中间栏：操作台 === */}
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

          {/* 信息仪表盘 */}
          <div className="shrink-0 w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-4 text-white shadow-xl flex justify-between items-center relative overflow-hidden border border-slate-700">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
             
             {/* 左：期号 */}
             <div className="z-10">
               <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                 <RefreshCw className="w-3 h-3 animate-spin"/> 当前期号
               </div>
               <div className="text-2xl font-black tracking-tight text-white">
                 第 <span className="text-yellow-400">{nextIssueInfo.issue}</span> 期
               </div>
             </div>

             {/* 中：时间 */}
             <div className="z-10 flex flex-col items-center justify-center">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Current Time</div>
                <div className="text-xl font-mono font-bold text-slate-200 tabular-nums tracking-widest flex items-center gap-2">
                  <Timer className="w-4 h-4 text-slate-500" />
                  {currentTime}
                </div>
             </div>

             {/* 右：截止 */}
             <div className="z-10 text-right">
               <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-end gap-1">
                 <Clock className="w-3 h-3"/> 截止时间
               </div>
               <div className="text-base font-bold text-white flex items-center gap-1">
                 {nextIssueInfo.deadline}
                 <AlertCircle className="w-4 h-4 text-red-400" />
               </div>
             </div>
          </div>

          {/* 选号机器 */}
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

          {/* 我的记录 (清爽版) */}
          <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-100 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2">
                 <History className="w-4 h-4 text-slate-500" />
                 <span className="text-slate-700 font-bold text-sm">我的选号记录</span>
               </div>
               {history.length > 0 && (
                 <button onClick={() => {setHistory([]); localStorage.removeItem('lottery-history')}} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                   <Trash2 className="w-3 h-3"/> 清空
                 </button>
               )}
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
                    {/* 仅保留参考信息，去掉夸张的图标 */}
                    {item.prizeLevel > 0 && (
                       <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                          <span>参考上期({item.winIssue}): {getPrizeText(item.prizeLevel)}</span>
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
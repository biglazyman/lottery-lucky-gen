'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Copy, Sparkles, Trophy, Flame, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

// 定义数据类型
type DrawData = {
  issue: string;
  red: number[];
  blue: number;
  date?: string;
};

type HistoryItem = {
  red: number[];
  blue: number;
  date: string;
  isWin?: boolean;
};

export default function Home() {
  const [redBalls, setRedBalls] = useState<number[]>([]);
  const [blueBall, setBlueBall] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // 新增：真实开奖数据状态
  const [latestDraw, setLatestDraw] = useState<DrawData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 1. 初始化：加载历史 + 获取最新开奖数据
  useEffect(() => {
    // 加载本地历史
    const saved = localStorage.getItem('lottery-history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }

    // 获取真实开奖数据
    fetch('/api/lottery')
      .then(res => res.json())
      .then(res => {
        if (res.data) {
          setLatestDraw(res.data);
        }
      })
      .catch(err => console.error('API Error:', err))
      .finally(() => setIsLoadingData(false));
  }, []);

  // 2. 历史更新同步到本地
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('lottery-history', JSON.stringify(history));
    }
  }, [history]);

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

  // 检查中奖逻辑 (对比真实数据)
  const checkWin = (red: number[], blue: number) => {
    if (!latestDraw) return false;
    const redHits = red.filter(r => latestDraw.red.includes(r)).length;
    const blueHit = blue === latestDraw.blue;
    // 简单规则：蓝球中，或者红球中4个以上
    return blueHit || redHits >= 4;
  };

  const generateNumbers = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const newReds: number[] = [];
      while (newReds.length < 6) {
        const num = getTrueRandom(1, 33, newReds);
        newReds.push(num);
      }
      newReds.sort((a, b) => a - b);
      const newBlue = getTrueRandom(1, 16);

      setRedBalls(newReds);
      setBlueBall(newBlue);

      // 实时计算中奖
      const isWin = checkWin(newReds, newBlue);
      if (isWin) triggerConfetti();

      const newRecord = {
        red: newReds, 
        blue: newBlue, 
        date: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        isWin
      };

      setHistory(prev => [newRecord, ...prev].slice(0, 50));
      setIsAnimating(false);
    }, 600);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#3b82f6', '#fbbf24']
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center relative overflow-x-hidden pb-10">
      
      {/* 顶部实时开奖横幅 (真实数据) */}
      <div className="w-full bg-slate-900 text-white py-3 px-4 text-sm font-medium flex justify-center items-center shadow-md">
        {isLoadingData ? (
          <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> 正在同步福彩中心数据...</span>
        ) : latestDraw ? (
          <div className="flex flex-wrap justify-center gap-2 items-center animate-in fade-in">
            <span className="text-slate-400">第 {latestDraw.issue} 期开奖:</span>
            <div className="flex gap-1">
              {latestDraw.red.map(n => <span key={n} className="text-red-400 font-bold">{n.toString().padStart(2, '0')}</span>)}
              <span className="text-blue-400 font-bold">{latestDraw.blue.toString().padStart(2, '0')}</span>
            </div>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded ml-2 text-slate-400 hidden sm:inline">{latestDraw.date}</span>
          </div>
        ) : (
          <span className="text-slate-400">暂无开奖数据</span>
        )}
      </div>

      {/* 吸欧气提示 */}
      {history.some(h => h.isWin) && (
        <div className="w-full bg-yellow-50 border-b border-yellow-100 text-yellow-800 py-2 px-4 text-xs font-bold flex justify-center items-center gap-2 animate-in slide-in-from-top">
          <Flame className="w-3 h-3 text-red-500 animate-pulse" />
          <span>欧气爆棚！下方记录已命中上期号码！</span>
        </div>
      )}

      <div className="py-8 px-4 flex flex-col items-center w-full max-w-2xl">
        {/* 标题 */}
        <div className="text-center mb-8 space-y-1 cursor-pointer" onClick={triggerConfetti}>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2">
            <Sparkles className="text-yellow-500 w-8 h-8" />
            欧气选号机
          </h1>
          <p className="text-slate-500 text-xs font-mono bg-slate-100 inline-block px-2 py-1 rounded">Crypto.getRandomValues(True)</p>
        </div>

        {/* 核心选号区 */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 w-full mb-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-50 to-orange-50 rounded-full -mr-16 -mt-16 z-0 transition-transform group-hover:scale-110 duration-700"></div>
          
          <div className="relative z-10">
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 min-h-[60px]">
              {redBalls.length > 0 ? redBalls.map((num, idx) => (
                <div 
                  key={`red-${idx}`}
                  className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-inner
                    ${isAnimating ? 'animate-bounce' : 'animate-in zoom-in duration-300'}
                    bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-200 ring-2 ring-red-100`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {num.toString().padStart(2, '0')}
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-14 text-slate-300 text-sm">
                  <span>等待欧气注入...</span>
                </div>
              )}

              {blueBall !== null && (
                <div 
                  className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-inner ml-2 sm:ml-4
                  ${isAnimating ? 'animate-bounce' : 'animate-in zoom-in duration-500'}
                  bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200 ring-2 ring-blue-100`}
                  style={{ animationDelay: '600ms' }}
                >
                  {blueBall.toString().padStart(2, '0')}
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button 
                onClick={generateNumbers}
                disabled={isAnimating}
                className="group relative flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-2xl hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden w-full sm:w-auto justify-center"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <RefreshCw className={`w-5 h-5 ${isAnimating ? 'animate-spin' : ''}`} />
                {isAnimating ? '正在计算运势...' : '一键生成'}
              </button>
            </div>
          </div>
        </div>

        {/* 历史记录区 */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
             <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">选号记录</h3>
             {history.length > 0 && (
                <button onClick={() => {setHistory([]); localStorage.removeItem('lottery-history')}} className="text-xs text-red-400 hover:text-red-600">
                  清空
                </button>
             )}
          </div>
          
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {history.length === 0 && (
              <div className="text-center text-slate-300 text-sm py-8 flex flex-col items-center gap-2">
                <Copy className="w-8 h-8 opacity-20"/>
                暂无记录
              </div>
            )}
            {history.map((item, idx) => (
              <div 
                key={idx} 
                className={`p-4 flex justify-between items-center hover:bg-slate-50 transition-colors
                  ${item.isWin ? 'bg-yellow-50/50' : ''}`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex gap-2 text-base sm:text-lg font-mono tracking-tight font-medium">
                    {item.red.map(n => (
                      <span key={n} className={`${item.isWin && latestDraw?.red.includes(n) ? 'text-red-600 font-black' : 'text-slate-600'}`}>
                        {n.toString().padStart(2, '0')}
                      </span>
                    ))}
                    <span className="text-slate-300">|</span>
                    <span className={`${item.isWin && latestDraw?.blue === item.blue ? 'text-blue-600 font-black' : 'text-slate-400'}`}>
                      {item.blue.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    {item.date}
                    {item.isWin && <span className="text-yellow-600 font-bold flex items-center gap-1 bg-yellow-100 px-1.5 py-0.5 rounded-full"><Trophy className="w-3 h-3"/> 疑似中奖</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
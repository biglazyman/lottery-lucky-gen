'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Copy, Sparkles, Trophy, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

// 模拟的“最新一期”开奖号码 (你可以改成你刚才生成的某一组来测试中奖效果!)
const LATEST_DRAW = {
  issue: '2026001',
  red: [3, 8, 12, 18, 22, 29], 
  blue: 5
};

export default function Home() {
  const [redBalls, setRedBalls] = useState<number[]>([]);
  const [blueBall, setBlueBall] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [history, setHistory] = useState<{red: number[], blue: number, date: string, isWin?: boolean}[]>([]);

  // 1. 初始化加载：从 LocalStorage 读取历史
  useEffect(() => {
    const saved = localStorage.getItem('lottery-history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  // 2. 每次历史更新，同步到 LocalStorage
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

  // 检查是否中奖 (简单的逻辑：蓝球对上就算小奖，或者红球中3个以上)
  const checkWin = (red: number[], blue: number) => {
    const redHits = red.filter(r => LATEST_DRAW.red.includes(r)).length;
    const blueHit = blue === LATEST_DRAW.blue;
    // 简单规则：蓝球中，或者红球中4个以上，算“欧气爆发”
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

      const isWin = checkWin(newReds, newBlue);
      
      // 如果中奖（或运气好），放烟花！
      if (isWin) {
        triggerConfetti();
      }

      const newRecord = {
        red: newReds, 
        blue: newBlue, 
        date: new Date().toLocaleTimeString(),
        isWin
      };

      setHistory(prev => [newRecord, ...prev].slice(0, 50)); // 保存最近50条
      setIsAnimating(false);
    }, 600);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#3b82f6', '#fbbf24']
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center relative overflow-x-hidden">
      
      {/* 顶部吸欧气横幅 (仅当历史记录里有中奖时显示) */}
      {history.some(h => h.isWin) && (
        <div className="w-full bg-yellow-100 text-yellow-800 py-2 px-4 text-sm font-bold flex justify-center items-center gap-2 animate-in slide-in-from-top">
          <Flame className="w-4 h-4 text-red-500 animate-pulse" />
          <span>恭喜！你的记录中包含“欧气号码”，快点击下方记录吸欧气！</span>
        </div>
      )}

      <div className="py-12 px-4 flex flex-col items-center w-full max-w-2xl">
        {/* 标题 */}
        <div className="text-center mb-10 space-y-2 cursor-pointer" onClick={triggerConfetti}>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2">
            <Sparkles className="text-yellow-500" />
            欧气选号机
          </h1>
          <p className="text-slate-500 text-sm">点击标题试试手动放烟花</p>
        </div>

        {/* 选号展示区 */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full mb-8 relative overflow-hidden">
          {/* 装饰背景 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 z-0"></div>
          
          <div className="relative z-10">
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {redBalls.length > 0 ? redBalls.map((num, idx) => (
                <div 
                  key={`red-${idx}`}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-inner
                    ${isAnimating ? 'animate-bounce' : 'animate-in zoom-in duration-300'}
                    bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-200 ring-2 ring-red-100`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {num.toString().padStart(2, '0')}
                </div>
              )) : (
                <div className="text-slate-300 py-8">点击下方按钮生成你的专属号码</div>
              )}

              {blueBall !== null && (
                <div 
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-inner ml-2 sm:ml-4
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
                className="group relative flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
              >
                {/* 按钮光效 */}
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                
                <RefreshCw className={`w-6 h-6 ${isAnimating ? 'animate-spin' : ''}`} />
                {isAnimating ? '正在注入欧气...' : '随机生成号码'}
              </button>
            </div>
          </div>
        </div>

        {/* 历史记录区 */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-4 px-2">
             <h3 className="text-slate-500 font-bold uppercase tracking-wider text-sm">你的选号记录</h3>
             <span className="text-xs text-slate-400">本地自动保存</span>
          </div>
          
          <div className="space-y-3">
            {history.length === 0 && (
              <div className="text-center text-slate-300 text-sm py-4">暂无记录，快去生成第一注吧</div>
            )}
            {history.map((item, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border flex justify-between items-center transition-all
                  ${item.isWin 
                    ? 'bg-yellow-50 border-yellow-200 shadow-md scale-[1.02]' 
                    : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
                  }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex gap-2 text-lg font-mono tracking-tight">
                    {item.red.map(n => (
                      <span key={n} className={`${item.isWin && LATEST_DRAW.red.includes(n) ? 'text-red-600 font-black underline decoration-2 underline-offset-4' : 'text-slate-700'}`}>
                        {n.toString().padStart(2, '0')}
                      </span>
                    ))}
                    <span className="text-slate-300">|</span>
                    <span className={`${item.isWin && item.blue === LATEST_DRAW.blue ? 'text-blue-600 font-black underline decoration-2 underline-offset-4' : 'text-slate-400'}`}>
                      {item.blue.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    {item.date}
                    {item.isWin && <span className="text-yellow-600 font-bold flex items-center gap-1"><Trophy className="w-3 h-3"/> 疑似中奖</span>}
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
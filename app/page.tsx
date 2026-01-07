'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Copy, Sparkles } from 'lucide-react';

export default function Home() {
  const [redBalls, setRedBalls] = useState<number[]>([]);
  const [blueBall, setBlueBall] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [history, setHistory] = useState<{red: number[], blue: number}[]>([]);

  // 真随机生成器 (Crypto API)
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

  const generateNumbers = () => {
    setIsAnimating(true);
    // 模拟动画延迟，制造紧张感
    setTimeout(() => {
      const newReds: number[] = [];
      // 生成6个不重复的红球 (1-33)
      while (newReds.length < 6) {
        const num = getTrueRandom(1, 33, newReds);
        newReds.push(num);
      }
      // 排序让看起来更舒服
      newReds.sort((a, b) => a - b);
      
      // 生成1个蓝球 (1-16)
      const newBlue = getTrueRandom(1, 16);

      setRedBalls(newReds);
      setBlueBall(newBlue);
      
      // 加入历史记录 (模拟你的记录功能)
      setHistory(prev => [{red: newReds, blue: newBlue}, ...prev].slice(0, 5));
      setIsAnimating(false);
    }, 600); // 600ms的动画时间
  };

  // 第一次加载时自动生成一次
  useEffect(() => {
    generateNumbers();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
      {/* 标题栏 */}
      <div className="text-center mb-10 space-y-2">
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="text-yellow-500" />
          欧气选号机
        </h1>
        <p className="text-slate-500">基于浏览器加密级真随机算法</p>
      </div>

      {/* 核心选号区 */}
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full max-w-2xl">
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {/* 红球渲染 */}
          {redBalls.length > 0 ? redBalls.map((num, idx) => (
            <div 
              key={`red-${idx}`}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-inner
                ${isAnimating ? 'animate-bounce' : 'animate-in zoom-in duration-300'}
                bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-200 ring-2 ring-red-100`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {num.toString().padStart(2, '0')}
            </div>
          )) : (
            // 占位符
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="w-14 h-14 rounded-full bg-slate-100 animate-pulse"></div>
            ))
          )}

          {/* 蓝球渲染 */}
          {blueBall !== null ? (
            <div 
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-inner ml-4
              ${isAnimating ? 'animate-bounce' : 'animate-in zoom-in duration-500'}
              bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200 ring-2 ring-blue-100`}
              style={{ animationDelay: '600ms' }}
            >
              {blueBall.toString().padStart(2, '0')}
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-slate-100 animate-pulse ml-4"></div>
          )}
        </div>

        {/* 按钮区 */}
        <div className="flex justify-center gap-4">
          <button 
            onClick={generateNumbers}
            disabled={isAnimating}
            className="flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-6 h-6 ${isAnimating ? 'animate-spin' : ''}`} />
            {isAnimating ? '计算运势中...' : '随机生成号码'}
          </button>
        </div>
      </div>

      {/* 临时历史记录区 (让你看到记录功能的样子) */}
      <div className="mt-12 w-full max-w-xl">
        <h3 className="text-slate-400 font-semibold mb-4 text-sm uppercase tracking-wider text-center">刚刚生成的幸运号</h3>
        <div className="space-y-3">
          {history.map((item, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-2">
                {item.red.map(n => <span key={n} className="text-red-600 font-medium">{n.toString().padStart(2, '0')}</span>)}
                <span className="text-slate-300">|</span>
                <span className="text-blue-600 font-bold">{item.blue.toString().padStart(2, '0')}</span>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
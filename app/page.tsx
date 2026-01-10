'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Sparkles, Loader2, Calendar, Clock, Zap, History, Trash2, Globe, ChevronDown, List, X, CalendarDays, Award, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- 1. 基础配置 ---

type LotteryRule = {
  id: string;
  nameKey: string; 
  redCount: number;
  redMax: number;
  blueCount: number;
  blueMax: number;
  mainColor: string;
  subColor: string;
  hasSub: boolean;
  drawDays: number[];
};

const LOTTERY_TYPES: Record<string, LotteryRule> = {
  ssq: {
    id: 'ssq', nameKey: 'lottery_ssq',
    redCount: 6, redMax: 33, blueCount: 1, blueMax: 16,
    mainColor: 'bg-red-500', subColor: 'bg-blue-500', hasSub: true,
    drawDays: [0, 2, 4]
  },
  dlt: {
    id: 'dlt', nameKey: 'lottery_dlt',
    redCount: 5, redMax: 35, blueCount: 2, blueMax: 12,
    mainColor: 'bg-orange-500', subColor: 'bg-indigo-500', hasSub: true,
    drawDays: [1, 3, 6]
  },
};

const DICTIONARY = {
  zh: {
    title: '欧气选号机',
    action_roll: '注入欧气',
    action_rolling: '祈祷中...',
    history_title: '我的记录',
    official_title: '官方历史',
    clear: '清空',
    wait_draw: '下期',
    deadline: '截止',
    weekday_title: '今天是',
    empty_history: '暂无记录',
    lottery_ssq: '双色球',
    lottery_dlt: '大乐透',
    tip_sync: '数据同步中...',
    tip_no_data: '无历史比对',
    week_names: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    today: '今天',
    draw_issue: '第{n}期',
    win_prize: '中{n}',
    wait_result: '待开奖'
  },
  en: {
    title: 'Lucky Lotto',
    action_roll: 'Roll',
    action_rolling: 'Praying...',
    history_title: 'My Picks',
    official_title: 'History',
    clear: 'Clear',
    wait_draw: 'Next',
    deadline: 'Deadline',
    weekday_title: 'Today is',
    empty_history: 'No records',
    lottery_ssq: 'Union Lotto',
    lottery_dlt: 'Super Lotto',
    tip_sync: 'Syncing...',
    tip_no_data: 'No Data',
    week_names: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    today: 'Today',
    draw_issue: '#{n}',
    win_prize: 'Won {n}',
    wait_result: 'Waiting'
  }
};

type Lang = 'zh' | 'en';
type DrawData = { issue: string; date: string; week: string; red: number[]; blue: number[]; };
type HistoryItem = { issue: string; red: number[]; blue: number[]; date: string; type: string };

export default function Home() {
  const [lang, setLang] = useState<Lang>('zh');
  const [currentType, setCurrentType] = useState<string>('ssq');
  
  const [mainBalls, setMainBalls] = useState<number[]>([]);
  const [subBalls, setSubBalls] = useState<number[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  
  const [myHistory, setMyHistory] = useState<HistoryItem[]>([]);
  const [officialDraws, setOfficialDraws] = useState<DrawData[]>([]);
  // --- 新增: 明确的加载状态 ---
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  const [currentWeekday, setCurrentWeekday] = useState<string>('');
  const [deadlineStr, setDeadlineStr] = useState<string>('---');
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [year, setYear] = useState('');
  
  const rollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const t = DICTIONARY[lang];
  const rule = LOTTERY_TYPES[currentType] || LOTTERY_TYPES['ssq'];

  useEffect(() => {
    setYear(new Date().getFullYear().toString());
    const savedHistory = localStorage.getItem('lottery-history-v2');
    if (savedHistory) setMyHistory(JSON.parse(savedHistory));

    const savedType = localStorage.getItem('user-lottery-type');
    if (savedType && LOTTERY_TYPES[savedType]) {
        setCurrentType(savedType);
    }
  }, []);

  useEffect(() => {
    resetBalls(currentType);
    updateTimeInfo();
    
    // 每次切换类型，触发拉取
    fetchOfficialData(currentType);

    localStorage.setItem('user-lottery-type', currentType);

    const timer = setInterval(updateTimeInfo, 1000 * 60);
    return () => clearInterval(timer);
  }, [lang, currentType]);

  useEffect(() => {
    if (myHistory.length > 0) localStorage.setItem('lottery-history-v2', JSON.stringify(myHistory));
  }, [myHistory]);

  // --- 修复后的数据拉取逻辑 ---
  const fetchOfficialData = async (type: string) => {
    // 1. 如果是不支持 API 的彩种，直接清空并停止
    if (type !== 'ssq' && type !== 'dlt') {
       setOfficialDraws([]);
       return;
    }

    // 2. 开始加载：设置 loading 为 true
    setIsDataLoading(true);
    setOfficialDraws([]); // 清空旧数据，防止混淆

    try {
      // 加个时间戳防缓存
      const res = await fetch(`/api/lottery?type=${type}&t=${new Date().getTime()}`);
      const json = await res.json();
      
      if (json.success && Array.isArray(json.data)) {
        setOfficialDraws(json.data);
      } else {
        setOfficialDraws([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setOfficialDraws([]);
    } finally {
      // 3. 无论成功失败，都必须结束 loading 状态
      setIsDataLoading(false);
    }
  };

  const updateTimeInfo = () => {
    const now = new Date();
    setCurrentWeekday(t.week_names[now.getDay()]);
    calculateDeadline(now);
  };

  const calculateDeadline = (now: Date) => {
    const r = LOTTERY_TYPES[currentType] || LOTTERY_TYPES['ssq'];
    if (r.drawDays.length === 0) {
      setDeadlineStr('---');
      return;
    }
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const DEADLINE_HOUR = 20;

    if (r.drawDays.includes(currentDay) && currentHour < DEADLINE_HOUR) {
      setDeadlineStr(`${t.today} ${DEADLINE_HOUR}:00`);
      return;
    }

    let daysToAdd = 1;
    while (daysToAdd <= 7) {
      const nextDayIndex = (currentDay + daysToAdd) % 7;
      if (r.drawDays.includes(nextDayIndex)) {
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + daysToAdd);
        const weekName = t.week_names[targetDate.getDay()];
        setDeadlineStr(`${weekName} ${DEADLINE_HOUR}:00`);
        return;
      }
      daysToAdd++;
    }
  };

  const resetBalls = (type: string) => {
    const r = LOTTERY_TYPES[type] || LOTTERY_TYPES['ssq'];
    setMainBalls(Array(r.redCount).fill(0));
    setSubBalls(Array(r.blueCount).fill(0));
  };

  const startRolling = () => {
    if (isRolling) return;
    setIsRolling(true);

    rollIntervalRef.current = setInterval(() => {
       setMainBalls(Array(rule.redCount).fill(0).map(() => Math.floor(Math.random() * rule.redMax) + 1));
       if (rule.hasSub) {
         setSubBalls(Array(rule.blueCount).fill(0).map(() => Math.floor(Math.random() * rule.blueMax) + 1));
       }
    }, 50);

    setTimeout(() => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      
      const finalMains: number[] = [];
      const array = new Uint32Array(1);
      const getRand = (max: number, exclude: number[]) => {
          let n; do { window.crypto.getRandomValues(array); n = 1 + (array[0] % max); } while (exclude.includes(n)); return n;
      };

      while (finalMains.length < rule.redCount) finalMains.push(getRand(rule.redMax, finalMains));
      finalMains.sort((a, b) => a - b);

      const finalSubs: number[] = [];
      if (rule.hasSub) {
        while (finalSubs.length < rule.blueCount) finalSubs.push(getRand(rule.blueMax, finalSubs));
        finalSubs.sort((a, b) => a - b);
      }

      setMainBalls(finalMains);
      setSubBalls(finalSubs);
      setIsRolling(false);
      triggerConfetti();

      let targetIssue = '---';
      if (officialDraws.length > 0) {
          targetIssue = (parseInt(officialDraws[0].issue) + 1).toString();
      }

      const newRecord: HistoryItem = {
        issue: targetIssue,
        red: finalMains, 
        blue: finalSubs, 
        date: new Date().toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', {hour: '2-digit', minute:'2-digit'}),
        type: currentType
      };
      setMyHistory(prev => [newRecord, ...prev].slice(0, 50));
    }, 800);
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const checkWin = (userRed: number[], userBlue: number[], officialDraw: DrawData | undefined, type: string) => {
    if (!officialDraw) return { isMatch: false, hitsRed: [], hitsBlue: [], prize: '' };

    const hitsRed = userRed.filter(r => officialDraw.red.includes(r));
    const hitsBlue = userBlue.filter(b => officialDraw.blue.includes(b));
    
    const r = hitsRed.length;
    const b = hitsBlue.length;
    let prize = '';

    if (type === 'ssq') {
        if (r===6 && b===1) prize = '一等奖';
        else if (r===6 && b===0) prize = '二等奖';
        else if (r===5 && b===1) prize = '三等奖';
        else if ((r===5 && b===0) || (r===4 && b===1)) prize = '四等奖';
        else if ((r===4 && b===0) || (r===3 && b===1)) prize = '五等奖';
        else if (b===1) prize = '六等奖';
    } else if (type === 'dlt') {
        if (r===5 && b===2) prize = '一等奖';
        else if (r===5 && b===1) prize = '二等奖';
        else if (r===5 && b===0) prize = '三等奖';
        else if (r===4 && b===2) prize = '四等奖';
        else if (r===4 && b===1) prize = '五等奖';
        else if (r===3 && b===2) prize = '六等奖';
        else if (r===4 && b===0) prize = '七等奖';
        else if ((r===3 && b===1) || (r===2 && b===2)) prize = '八等奖';
        else if ((r===3 && b===0) || (r===2 && b===1) || (r===1 && b===2) || (r===0 && b===2)) prize = '九等奖';
    }

    return { isMatch: true, hitsRed, hitsBlue, prize };
  };

  const renderHistoryItem = (item: HistoryItem, idx: number) => {
    const itemRule = LOTTERY_TYPES[item.type] || LOTTERY_TYPES['ssq'];
    const officialData = officialDraws.find(d => d.issue === item.issue);
    const result = checkWin(item.red, item.blue, officialData, item.type);

    return (
      <div key={idx} className="px-4 py-3 border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 transition-colors">
        <div className="w-full">
          <div className="flex justify-between items-center mb-2">
             <div className="flex items-center gap-2">
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded font-bold uppercase">
                  {/* @ts-ignore */}
                  {t[itemRule.nameKey]}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {item.issue !== '---' ? t.draw_issue.replace('{n}', item.issue) : ''}
                </span>
             </div>
             {result.prize ? (
                 <div className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 animate-in zoom-in">
                    <Award className="w-3 h-3" />
                    {result.prize}
                 </div>
             ) : (
                 <span className="text-[10px] text-slate-300">
                    {officialData ? '未中奖' : item.date}
                 </span>
             )}
          </div>
          <div className="flex gap-1.5 text-sm font-mono font-bold items-center">
            {item.red.map((n, i) => {
                const isHit = result.hitsRed.includes(n);
                return (
                    <div key={`r-${i}`} className={`flex items-center justify-center rounded-full w-6 h-6 text-xs ${isHit ? 'bg-red-500 text-white shadow-sm' : 'text-slate-600 bg-transparent'}`}>{n.toString().padStart(2, '0')}</div>
                )
            })}
            {item.blue.length > 0 && <span className="text-slate-300 mx-1">|</span>}
            {item.blue.map((n, i) => {
                const isHit = result.hitsBlue.includes(n);
                return (
                    <div key={`b-${i}`} className={`flex items-center justify-center rounded-full w-6 h-6 text-xs ${isHit ? 'bg-blue-500 text-white shadow-sm' : 'text-blue-500 bg-transparent'}`}>{n.toString().padStart(2, '0')}</div>
                )
            })}
          </div>
        </div>
      </div>
    );
  };

  // --- 复用官方列表渲染 ---
  const renderOfficialList = () => {
    // 1. 如果不是 SSQ 或 DLT，显示“无数据”
    if (currentType !== 'ssq' && currentType !== 'dlt') {
        return <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2 min-h-[200px]"><AlertCircle className="w-8 h-8 opacity-20"/>{t.tip_no_data}</div>;
    }

    // 2. 如果正在加载，显示转圈
    if (isDataLoading) {
        return <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center"><Loader2 className="w-5 h-5 animate-spin mb-2"/>{t.tip_sync}</div>;
    }

    // 3. 如果加载完了但没数据，显示“暂无数据” (而不是一直转圈)
    if (officialDraws.length === 0) {
        return <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2 min-h-[200px]"><AlertCircle className="w-8 h-8 opacity-20"/>{t.tip_no_data}</div>;
    }

    // 4. 有数据，显示列表
    return officialDraws.map((draw, idx) => (
        <div key={idx} className="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
            <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-slate-700">No. {draw.issue}</span><span className="text-[10px] text-slate-400">{draw.date}</span></div>
            <div className="flex gap-1 text-sm font-mono font-bold">
                {draw.red.map((n, i) => <span key={i} className="text-red-500">{n.toString().padStart(2, '0')}</span>)}
                {draw.blue.map((n, i) => <span key={`b-${i}`} className="text-blue-500 ml-1">{n.toString().padStart(2, '0')}</span>)}
            </div>
        </div>
    ));
  };

  return (
    <main className="fixed inset-0 w-full bg-slate-50 flex flex-col items-center justify-start sm:justify-center overflow-hidden font-sans text-slate-900">
      
      <header className="w-full bg-white border-b border-slate-200 px-3 py-2 shrink-0 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-2" onClick={() => triggerConfetti()}>
           <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
           <div className="flex items-center gap-1.5">
             <h1 className="text-base sm:text-lg font-black tracking-tighter text-slate-800 whitespace-nowrap">{t.title}</h1>
             <span className="text-[10px] font-bold bg-yellow-400 text-yellow-950 px-1.5 rounded-md shadow-sm border border-yellow-300">{year}</span>
           </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
           <button onClick={() => setShowMobileHistory(true)} className="lg:hidden p-1.5 bg-slate-100 rounded-md text-slate-600 active:bg-slate-200"><List className="w-4 h-4" /></button>
           <div className="relative group">
              <select value={currentType} onChange={(e) => setCurrentType(e.target.value)} className="appearance-none bg-slate-100 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold py-1.5 pl-2 pr-7 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-24 sm:w-auto truncate">
                {Object.values(LOTTERY_TYPES).map(l => (
                  // @ts-ignore
                  <option key={l.id} value={l.id}>{t[l.nameKey]}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"/>
           </div>
           <button onClick={() => setLang(prev => prev === 'zh' ? 'en' : 'zh')} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-600"><Globe className="w-4 h-4 sm:w-5 sm:h-5" /></button>
        </div>
      </header>

      <div className="flex-1 w-full max-w-[1300px] p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-4 sm:gap-6 overflow-hidden">
        
        {/* Left: Official History */}
        <aside className="hidden lg:flex flex-col h-full overflow-hidden order-1 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
               <Calendar className="w-4 h-4 text-blue-500" />
               <h3 className="text-slate-700 font-bold text-sm">{t.official_title}</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {renderOfficialList()}
            </div>
        </aside>

        <section className="flex flex-col h-full min-h-0 overflow-hidden order-2 relative">
          <div className="shrink-0 w-full bg-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 text-white shadow-lg flex justify-between items-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
             <div className="z-10 flex-1 min-w-0">
               <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><RefreshCw className="w-3 h-3"/> {t.wait_draw}</div>
               <div className="text-lg sm:text-2xl font-black tracking-tight text-white truncate"><span className="text-yellow-400">{(currentType === 'ssq' || currentType === 'dlt') && officialDraws.length > 0 ? t.draw_issue.replace('{n}', (parseInt(officialDraws[0].issue) + 1).toString().slice(-3)) : '---'}</span></div>
             </div>
             <div className="z-10 flex-1 flex flex-col items-center border-l border-r border-slate-700/50 px-1 mx-1 sm:px-2 sm:mx-2">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><Clock className="w-3 h-3"/> {t.deadline}</div>
                <div className="text-sm sm:text-lg font-bold text-white whitespace-nowrap">{deadlineStr}</div>
             </div>
             <div className="z-10 flex-1 flex flex-col items-end">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">{t.weekday_title}</div>
                <div className="text-lg sm:text-xl font-bold text-slate-200 flex items-center gap-1"><CalendarDays className="w-4 h-4 text-slate-500 hidden sm:block" />{currentWeekday}</div>
             </div>
          </div>

          <div className="shrink-0 bg-white p-4 sm:p-8 rounded-2xl sm:rounded-[1.5rem] shadow-sm border border-slate-200 w-full mb-3 sm:mb-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[180px] sm:min-h-[200px]">
             <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 max-w-full">
                {mainBalls.map((num, idx) => (
                  <div key={`m-${idx}`} className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-lg sm:text-2xl font-black shadow-inner transition-all duration-100 text-white ${rule.mainColor} ${isRolling ? 'scale-105 blur-[0.5px]' : ''}`}>{num === 0 ? '?' : num.toString().padStart(2, '0')}</div>
                ))}
                {subBalls.map((num, idx) => (
                  <div key={`s-${idx}`} className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-lg sm:text-2xl font-black shadow-inner transition-all duration-100 text-white ${rule.subColor} ${isRolling ? 'scale-105 blur-[0.5px]' : ''}`}>{num === 0 ? '?' : num.toString().padStart(2, '0')}</div>
                ))}
             </div>
             <button onClick={startRolling} disabled={isRolling} className="relative w-full sm:w-64 h-12 sm:h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-base sm:text-lg shadow-xl active:scale-95 disabled:opacity-80 transition-all flex items-center justify-center gap-2 group overflow-hidden">
                 <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-shine" />
                 <Zap className={`w-5 h-5 ${isRolling ? 'animate-pulse' : ''}`} />
                 {isRolling ? t.action_rolling : t.action_roll}
             </button>
          </div>

          <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2"><History className="w-4 h-4 text-slate-500" /><span className="text-slate-700 font-bold text-sm">{t.history_title}</span></div>
               {myHistory.length > 0 && <button onClick={() => {setMyHistory([]); localStorage.removeItem('lottery-history-v2')}} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"><Trash2 className="w-3 h-3"/> {t.clear}</button>}
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {myHistory.length === 0 && <div className="text-center text-slate-300 text-sm py-10">{t.empty_history}</div>}
              {myHistory.map((item, idx) => renderHistoryItem(item, idx))}
            </div>
          </div>
        </section>

        <aside className="hidden lg:flex flex-col h-full order-3 overflow-hidden">
          <div className="h-full bg-slate-50 border border-slate-100 rounded-xl overflow-hidden flex items-center justify-center text-slate-300 text-xs">AD SPACE</div>
        </aside>
      </div>

      {showMobileHistory && (
        <div className="fixed inset-0 z-50 lg:hidden flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[80%] sm:h-[600px] sm:w-[500px] sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-500" /><h3 className="font-bold text-slate-800">{t.official_title}</h3></div>
                <button onClick={() => setShowMobileHistory(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X className="w-5 h-5" /></button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {renderOfficialList()}
             </div>
          </div>
        </div>
      )}

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
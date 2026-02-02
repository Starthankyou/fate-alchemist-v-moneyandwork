import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings, Clock, Landmark, Compass,
  Target, RefreshCw,
  CalendarDays, ChevronLeft, ChevronRight, X, List, Save, Trash2, Sparkles, Briefcase, Shirt, TrendingUp, DollarSign, Star, Calendar
} from 'lucide-react';

// --- 1. 全域靜態數據 ---
const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const pillarLabels = ['年柱', '月柱', '日柱', '時柱'];
const stemClashes = { "甲":"庚", "庚":"甲", "乙":"辛", "辛":"乙", "丙":"壬", "壬":"丙", "丁":"癸", "癸":"丁" };

const interactions = {
  "Clashes": { "子": "午", "午": "子", "丑": "未", "未": "丑", "寅": "申", "申": "寅", "卯": "酉", "酉": "卯", "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳" },
  "HiddenStems": { "子": ["癸"], "丑": ["己", "癸", "辛"], "寅": ["甲", "丙", "戊"], "卯": ["乙"], "辰": ["戊", "乙", "癸"], "巳": ["丙", "庚", "戊"], "午": ["丁", "己"], "未": ["己", "丁", "乙"], "申": ["庚", "壬", "戊"], "酉": ["辛"], "戌": ["戊", "辛", "丁"], "亥": ["壬", "甲"] }
};

const godsData = {
  "SheepBlade": { "甲": "卯", "乙": "辰", "丙": "午", "丁": "未", "戊": "午", "己": "未", "庚": "酉", "辛": "戌", "壬": "子", "癸": "丑" },
  "NoblePeople": { "甲": ["丑", "未"], "戊": ["丑", "未"], "庚": ["丑", "未"], "乙": ["子", "申"], "己": ["子", "申"], "丙": ["亥", "酉"], "丁": ["亥", "酉"], "壬": ["卯", "巳"], "癸": ["卯", "巳"], "辛": ["寅", "午"] }
};

// 色彩邏輯：85+ 綠燈(攻), 65-84 藍燈(取), 45-64 金燈(觀), <45 紅燈(避)
const getScoreVisuals = (score) => {
  if (score >= 85) return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', label: '攻', msg: '綠燈通行。氣勢極盛，宜積極決策。' };
  if (score >= 65) return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500', label: '取', msg: '穩定前進。資源到位，宜落實計畫。' };
  if (score >= 45) return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', label: '觀', msg: '黃燈待機。局勢待定，宜內部整頓。' };
  return { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500', label: '避', msg: '紅燈警戒。壓力偏大，宜收斂防守。' };
};

const LUCK_ENHANCEMENT = {
  "木": { color: "青綠色", accessory: "木質飾物", action: "宜策劃新局、求職應聘" },
  "火": { color: "紅色、紫色", accessory: "亮面飾品", action: "宜加強宣傳、公關應酬" },
  "土": { color: "黃色、咖啡色", accessory: "陶瓷印章", action: "宜守成簽約、內部整頓" },
  "金": { color: "白色、金色", accessory: "金屬名錶", action: "宜決斷整頓、建立規矩" },
  "水": { color: "黑色、藍色", accessory: "珍珠銀飾", action: "宜市場調研、溝通談判" }
};

const WISDOM_VAULT = {
  low: [{ source: "《易經》", original: "君子以恐懼修省。", translation: "紅燈警戒。今日宜收斂心神，凡事不妄動則無災。" }],
  mid: [{ source: "《大學》", original: "知止而后有定。", translation: "局勢中平。在平穩中學會知足，智慧自然萌發。" }],
  high: [{ source: "《道德經》", original: "功遂身退，天之道也。", translation: "綠燈通達。極盛之時更應謙遜分享，福澤方能長久。" }]
};

const academicData = {
  "甲": { "year_adj": 10 }, "乙": { "year_adj": 10 }, "丙": { "year_adj": -20 }, "丁": { "year_adj": -15 }, "戊": { "year_adj": 5 },
  "己": { "year_adj": 5 }, "庚": { "year_adj": -15 }, "辛": { "year_adj": -10 }, "壬": { "year_adj": 20 }, "癸": { "year_adj": 15 }
};

// --- 工具函數 ---
const getElementFunc = (char) => {
  if (['甲', '乙', '寅', '卯'].includes(char)) return '木';
  if (['丙', '丁', '巳', '午'].includes(char)) return '火';
  if (['戊', '己', '辰', '戌', '丑', '未'].includes(char)) return '土';
  if (['庚', '辛', '申', '酉'].includes(char)) return '金';
  if (['壬', '癸', '亥', '子'].includes(char)) return '水';
  return '';
};

const getShiShenFunc = (dm, target) => {
  const dmElem = getElementFunc(dm);
  const targetElem = getElementFunc(target);
  if (!dmElem || !targetElem) return "";
  const dmYang = stems.indexOf(dm) % 2 === 0;
  const targetYang = stems.indexOf(target) % 2 === 0;
  const sameGender = dmYang === targetYang;
  const map = {
    "木": { "木": "比劫", "火": "食傷", "土": "財星", "金": "官殺", "水": "印星" },
    "火": { "火": "比劫", "土": "食傷", "金": "財星", "水": "官殺", "木": "印星" },
    "土": { "土": "比劫", "金": "食傷", "水": "財星", "木": "官殺", "火": "印星" },
    "金": { "金": "比劫", "水": "食傷", "木": "財星", "火": "官殺", "土": "印星" },
    "水": { "水": "比劫", "木": "食傷", "火": "財星", "土": "官殺", "金": "印星" }
  };
  const base = map[dmElem][targetElem];
  if (base === "比劫") return sameGender ? "比肩" : "劫財";
  if (base === "食傷") return sameGender ? "食神" : "傷官";
  if (base === "財星") return sameGender ? "偏財" : "正財";
  if (base === "官殺") return sameGender ? "七殺" : "正官";
  if (base === "印星") return sameGender ? "梟神" : "正印";
  return "";
};

const getGanZhi = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  const baseDate = new Date('2024-02-10T00:00:00'); 
  const diffDays = Math.floor((d.getTime() - baseDate.getTime()) / (86400000));
  const s = stems[((diffDays % 10) + 10) % 10];
  const b = branches[((diffDays + 4) % 12 + 12) % 12];
  return { stem: s, branch: b, pillar: s + b };
};

const getKongWangFunc = (stem, branch) => {
  const sIdx = stems.indexOf(stem);
  const bIdx = branches.indexOf(branch);
  let diff = bIdx - sIdx;
  if (diff < 0) diff += 12;
  const map = { 0: ["戌", "亥"], 10: ["申", "酉"], 8: ["午", "未"], 6: ["辰", "巳"], 4: ["寅", "卯"], 2: ["子", "丑"] };
  return map[diff] || [];
};

// --- localStorage 工具函數 ---
const STORAGE_KEY = 'bazi-profiles';
const loadProfiles = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};
const saveProfiles = (profiles) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
};

const App = () => {
  const [natalStems, setNatalStems] = useState(['丙', '庚', '庚', '壬']); 
  const [natalBranches, setNatalBranches] = useState(['寅', '子', '申', '子']); 
  const [bigLuckPillar, setBigLuckPillar] = useState({ stem: '乙', branch: '未' }); 
  const [annualPillar, setAnnualPillar] = useState({ stem: '丙', branch: '午' }); // 新增流年柱
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarDate, setCalendarDate] = useState(new Date()); 
  const [viewMode, setViewMode] = useState('simple');
  const [result, setResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [profileName, setProfileName] = useState("");
  const [modalDate, setModalDate] = useState(null);
  const [strategyList, setStrategyList] = useState(null);

  const dmStem = natalStems[2];

  // 載入本地儲存的設定檔
  useEffect(() => {
    setProfiles(loadProfiles());
  }, []);

  // --- 4. 智慧雙軌運算引擎 (導入流年邏輯) ---
  const runEngine = (dateStr) => {
    const gz = getGanZhi(dateStr);
    const dm = dmStem;
    const dmInfo = academicData[dm] || academicData["庚"];
    let wealthScore = 50; 
    let careerScore = 50;
    const tags = [];
    
    // 背景大運與年歲調整
    wealthScore += (dmInfo.year_adj || 0);
    careerScore += (dmInfo.year_adj || 0);

    const monthBranch = natalBranches[1];
    const hasRoot = natalBranches.some(b => interactions.HiddenStems[b]?.includes(dm));
    const isStrong = interactions.HiddenStems[monthBranch]?.includes(dm) || hasRoot;

    // --- [流年歲君動態判定] ---
    // 若流日干支與手動設定的「流年柱」發生天克地沖，則為日犯歲君
    const stemClashYear = stemClashes[gz.stem] === annualPillar.stem;
    const branchClashYear = interactions.Clashes[gz.branch] === annualPillar.branch;
    
    if (stemClashYear && branchClashYear) {
        wealthScore -= 35; careerScore -= 35; tags.push("💀 日犯歲君");
    } else if (gz.stem === annualPillar.stem && gz.branch === annualPillar.branch) {
        tags.push("👑 歲日並臨"); // 能量極端化
    }

    const stemRel = getShiShenFunc(dm, gz.stem);
    const isWealth = stemRel.includes("財");
    const isOfficer = stemRel.includes("官") || stemRel.includes("殺");
    const isInductor = stemRel.includes("印") || stemRel.includes("梟");

    // 財運運算
    if (isWealth) {
      wealthScore += 30; tags.push("💰 財星");
      if (natalStems.some(s => getShiShenFunc(dm, s).includes("劫"))) wealthScore -= 20;
      if (natalBranches.some(b => interactions.HiddenStems[b]?.includes(gz.stem))) wealthScore += 25;
    } else if (stemRel.includes("食") || stemRel.includes("傷")) {
      wealthScore += 15;
    }

    // 事業運算：強化官殺印星化解邏輯
    if (isOfficer) {
      if (isStrong) { careerScore += 40; tags.push("💼 官星"); }
      else {
        const hasInductor = natalStems.some(s => getShiShenFunc(dm, s).includes("印") || getShiShenFunc(dm, s).includes("梟"));
        if (hasInductor) { careerScore += 25; tags.push("🛡️ 殺印"); }
        else { careerScore -= 25; tags.push("🆘 官殺"); }
      }
    }
    if (isInductor) { careerScore += 30; tags.push("📜 印綬"); }

    // 神煞與空亡
    const kw = getKongWangFunc(dm, natalBranches[2]);
    if (kw.includes(gz.branch)) { wealthScore -= 20; careerScore -= 20; tags.push("🌫️ 空亡"); }

    wealthScore = Math.max(0, Math.min(100, wealthScore));
    careerScore = Math.max(0, Math.min(100, careerScore));
    
    // 主導權重
    let mainScore = (wealthScore + careerScore) / 2;
    if ((isOfficer || isInductor) && !isWealth) mainScore = careerScore * 0.85 + wealthScore * 0.15;
    else if (isWealth && !isOfficer) mainScore = wealthScore * 0.85 + careerScore * 0.15;

    const strat = getScoreVisuals(mainScore);
    return { wealthScore, careerScore, mainScore, strategy: strat, flowDay: gz, tags, stemRel, isStrong };
  };

  const monthlyOutlook = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const daysArr = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const currentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      daysArr.push({ date: i, fullDate: currentStr, ...runEngine(currentStr) });
    }
    return { days: daysArr, blanks: Array(firstDay).fill(null), monthName: `${year}年 ${month + 1}月` };
  }, [natalStems, natalBranches, bigLuckPillar, annualPillar, calendarDate]);

  const analyses = useMemo(() => {
    if (!result) return { detailed: [], simple: [], spiritual: null };
    const { wealthScore, careerScore, tags, flowDay, stemRel, isStrong, mainScore } = result;
    const dateNum = parseInt(selectedDate.split('-')[2]);
    let libKey = mainScore < 45 ? "low" : mainScore > 84 ? "high" : "mid";
    const vault = WISDOM_VAULT[libKey];
    const spiritual = vault[dateNum % vault.length];

    const detailed = [
      { title: "財富基底", content: wealthScore > 75 ? "今日財運旺盛，利於商務成交、資產獲取。" : "財富氣場平穩，日常開銷宜有節制。", impact: wealthScore > 75 ? "財氣豐沛" : "穩健守成" },
      { title: "事業維度", content: stemRel.includes("官") || stemRel.includes("印") ? (careerScore > 65 ? "官印照命，利於權力掌控、晉升或執行決策。" : "事業壓力顯著，宜謹言慎行，防範非議。") : "事業氣場平穩，宜專注於例行性業務處理。", impact: "事業判定" },
      { title: spiritual.source + "：修行引領", content: spiritual.original + " —— " + spiritual.translation, impact: "改命修行" }
    ];
    return { detailed, simple: [`今日「${flowDay.pillar}」日，${tags.length > 0 ? tags.join('、') : '氣象平和'}。`], spiritual };
  }, [result, selectedDate]);

  useEffect(() => {
    setIsCalculating(true);
    const timer = setTimeout(() => { setResult(runEngine(selectedDate)); setIsCalculating(false); }, 300);
    return () => clearTimeout(timer);
  }, [natalStems, natalBranches, bigLuckPillar, annualPillar, selectedDate]);

  const loadProfile = (p) => {
    setNatalStems(p.natalStems);
    setNatalBranches(p.natalBranches);
    if (p.bigLuckPillar) setBigLuckPillar(p.bigLuckPillar);
    if (p.annualPillar) setAnnualPillar(p.annualPillar);
  };

  const saveCurrentProfile = () => {
    if (!profileName.trim()) return;
    const newProfile = {
      id: Date.now().toString(),
      name: profileName.trim(),
      natalStems,
      natalBranches,
      bigLuckPillar,
      annualPillar,
      updatedAt: Date.now()
    };
    const existingIndex = profiles.findIndex(p => p.name === profileName.trim());
    let updatedProfiles;
    if (existingIndex >= 0) {
      updatedProfiles = [...profiles];
      updatedProfiles[existingIndex] = newProfile;
    } else {
      updatedProfiles = [...profiles, newProfile];
    }
    setProfiles(updatedProfiles);
    saveProfiles(updatedProfiles);
    setProfileName("");
  };

  const deleteProfile = (id) => {
    const updatedProfiles = profiles.filter(p => p.id !== id);
    setProfiles(updatedProfiles);
    saveProfiles(updatedProfiles);
  };

  const showFilteredList = (cat) => {
    let filtered;
    if (['官殺運', '印星運', '財運日'].includes(cat)) {
      filtered = monthlyOutlook.days.filter(d => {
        if (cat === '官殺運') return d.stemRel.includes('官') || d.stemRel.includes('殺');
        if (cat === '印星運') return d.stemRel.includes('印') || d.stemRel.includes('梟');
        if (cat === '財運日') return d.stemRel.includes('財');
        return false;
      });
    } else {
      filtered = monthlyOutlook.days.filter(d => d.strategy.label === cat);
    }
    setStrategyList({ type: cat, days: filtered });
  };

  // --- 內部組件 ---
  const DayModal = () => {
    if (!modalDate) return null;
    const dData = runEngine(modalDate);
    const tips = LUCK_ENHANCEMENT[getElementFunc(dData.flowDay.branch)] || LUCK_ENHANCEMENT["金"];
    const visuals = dData.strategy;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md">
        <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden relative p-8 space-y-6 animate-in zoom-in-95 duration-200 font-sans">
          <button onClick={() => setModalDate(null)} className="absolute top-8 right-8 p-1 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${visuals.bg} border ${visuals.border}`}><Star className={visuals.color} size={24} /></div>
            <div>
              <h4 className="text-xl font-bold text-slate-800">{modalDate}</h4>
              <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">{dData.flowDay.pillar}日 · {dData.stemRel}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 font-sans">
             <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
                <DollarSign className="mx-auto text-emerald-600 mb-1" size={20} />
                <span className="text-[9px] text-slate-400 font-black block uppercase tracking-widest">財運指數</span>
                <span className={`text-3xl font-black ${getScoreVisuals(dData.wealthScore).color}`}>{dData.wealthScore}</span>
             </div>
             <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
                <Briefcase className="mx-auto text-blue-600 mb-1" size={20} />
                <span className="text-[9px] text-slate-400 font-black block uppercase tracking-widest">事業指數</span>
                <span className={`text-3xl font-black ${getScoreVisuals(dData.careerScore).color}`}>{dData.careerScore}</span>
             </div>
          </div>
          <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-4">
            <div className="flex items-center gap-2 text-indigo-700 font-black text-[10px] uppercase tracking-widest"><Sparkles size={14} className="animate-pulse" /> 雙軌開運決策</div>
            <div className="space-y-2">
              <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <Target className="text-emerald-500" size={20} />
                <div className="space-y-0.5"><span className="text-[9px] text-slate-400 font-bold block uppercase">重大決策</span><p className="text-[13px] font-black text-slate-700">{tips.action}</p></div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <Shirt className="text-blue-500" size={20} />
                <div className="space-y-0.5"><span className="text-[9px] text-slate-400 font-bold block uppercase">開運穿搭</span><p className="text-[13px] font-black text-slate-700">{tips.color}</p></div>
              </div>
            </div>
          </div>
          <button onClick={() => setModalDate(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em]">獲悉並收斂</button>
        </div>
      </div>
    );
  };

  const ListModal = () => {
    if (!strategyList) return null;
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative font-sans">
          <button onClick={() => setStrategyList(null)} className="absolute top-6 right-6 p-1.5 hover:bg-slate-100 rounded-full font-sans"><X size={20} /></button>
          <div className="p-8 space-y-8 font-sans">
            <div className="flex items-center gap-4 font-sans">
              <div className={`p-3 rounded-2xl bg-indigo-50`}><List className="text-indigo-600" size={24} /></div>
              <div><h4 className="text-xl font-black text-slate-800 tracking-tighter">【{strategyList.type}】關鍵名單</h4><p className="text-slate-400 font-bold text-[10px] uppercase mt-1 tracking-widest">{monthlyOutlook.monthName}</p></div>
            </div>
            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar font-sans">
              {strategyList.days.map((day, idx) => (
                <div key={idx} onClick={() => { setSelectedDate(day.fullDate); setStrategyList(null); }} className="p-4 bg-slate-50 hover:bg-indigo-50 rounded-2xl border transition-all cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-slate-700 border shadow-sm text-sm">{day.date}</span>
                    <div><div className="text-sm font-black text-slate-800">{day.flowDay.pillar}日 · {day.stemRel}</div><div className="text-[10px] text-slate-400">{day.strategy.msg}</div></div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${getScoreVisuals(day.wealthScore).bg} ${getScoreVisuals(day.wealthScore).color}`}>財 {day.wealthScore}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${getScoreVisuals(day.careerScore).bg} ${getScoreVisuals(day.careerScore).color}`}>事 {day.careerScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6 font-sans">
        
        {/* Header - 精鍊版 */}
        <header className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center relative overflow-hidden font-sans">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-600 font-sans"></div>
          <Landmark className="text-emerald-600 w-10 h-10 opacity-90 mx-auto mb-2 font-sans" />
          <h1 className="text-2xl font-black tracking-widest text-slate-900 uppercase font-sans">八字大師：財官雙美</h1>
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.4em] italic font-sans px-1">Algorithm v11.0 · 歲運導航版</p>
          {isCalculating && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50"><RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" /></div>}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
          {/* 左側：核心設定區 */}
          <div className="lg:col-span-4 space-y-6 font-sans">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-50 space-y-8 font-sans">
              <h2 className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest border-b pb-3 font-sans"><Settings size={14} className="text-emerald-500" /> 命盤設定</h2>
              
              <div className="space-y-8 font-sans">
                {/* 1. 原局四柱 */}
                <div className="space-y-4 font-sans">
                  <label className="text-[10px] font-black text-slate-500 block uppercase tracking-widest px-1 font-sans">1. 原局四柱挑選</label>
                  <div className="grid grid-cols-4 gap-2 font-sans">
                    {pillarLabels.map((label, i) => (
                      <div key={i} className={`p-2 rounded-xl border text-center font-sans ${i === 2 ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-100' : 'bg-slate-50'}`}>
                        <div className={`text-[8px] font-bold mb-1 font-sans ${i === 2 ? 'text-emerald-700' : 'text-slate-400'}`}>{label}</div>
                        <select value={natalStems[i]} onChange={(e) => { const ns = [...natalStems]; ns[i] = e.target.value; setNatalStems(ns); }} className="w-full text-xs font-black bg-transparent outline-none cursor-pointer mb-1 text-center font-sans">{stems.map(st => <option key={st} value={st}>{st}</option>)}</select>
                        <select value={natalBranches[i]} onChange={(e) => { const nb = [...natalBranches]; nb[i] = e.target.value; setNatalBranches(nb); }} className="w-full text-xs font-black bg-transparent outline-none cursor-pointer text-center font-sans">{branches.map(b => <option key={b} value={b}>{b}</option>)}</select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. 流年與大運 (補回大運，新增流年) */}
                <div className="space-y-6 font-sans border-t pt-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 block uppercase tracking-widest flex items-center gap-2 font-sans font-sans"><Calendar size={12} className="text-emerald-400" /> 2. 目前流年柱</label>
                    <div className="flex gap-2 p-1 bg-slate-50 rounded-xl shadow-inner font-sans font-sans">
                      <select value={annualPillar.stem} onChange={(e) => setAnnualPillar({...annualPillar, stem: e.target.value})} className="flex-1 p-2 bg-white border-none rounded-lg text-center font-black text-emerald-900 text-xs font-sans">{stems.map(s => <option key={s} value={s}>{s}</option>)}</select>
                      <select value={annualPillar.branch} onChange={(e) => setAnnualPillar({...annualPillar, branch: e.target.value})} className="flex-1 p-2 bg-white border-none rounded-lg text-center font-black text-emerald-900 text-xs font-sans">{branches.map(b => <option key={b} value={b}>{b}</option>)}</select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 block uppercase tracking-widest flex items-center gap-2 font-sans font-sans"><Compass size={12} className="text-blue-400" /> 3. 目前大運柱</label>
                    <div className="flex gap-2 p-1 bg-slate-50 rounded-xl shadow-inner font-sans font-sans">
                      <select value={bigLuckPillar.stem} onChange={(e) => setBigLuckPillar({...bigLuckPillar, stem: e.target.value})} className="flex-1 p-2 bg-white border-none rounded-lg text-center font-black text-indigo-900 text-xs font-sans">{stems.map(s => <option key={s} value={s}>{s}</option>)}</select>
                      <select value={bigLuckPillar.branch} onChange={(e) => setBigLuckPillar({...bigLuckPillar, branch: e.target.value})} className="flex-1 p-2 bg-white border-none rounded-lg text-center font-black text-indigo-900 text-xs font-sans">{branches.map(b => <option key={b} value={b}>{b}</option>)}</select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 font-sans border-t pt-6">
                  <label className="text-[10px] font-black text-slate-500 block uppercase tracking-widest flex items-center gap-2 font-sans font-sans font-sans"><Clock size={12} className="text-emerald-400" /> 4. 查詢日期</label>
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl font-black text-emerald-950 shadow-inner text-sm font-sans" />
                </div>

                {/* 5. 設定檔管理 */}
                <div className="space-y-4 font-sans border-t pt-6">
                  <label className="text-[10px] font-black text-slate-500 block uppercase tracking-widest flex items-center gap-2"><Save size={12} className="text-indigo-400" /> 5. 設定檔管理</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="輸入名稱儲存..."
                      className="flex-1 p-2 bg-slate-50 border-none rounded-lg text-xs font-bold"
                    />
                    <button
                      onClick={saveCurrentProfile}
                      disabled={!profileName.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                    >
                      儲存
                    </button>
                  </div>
                  {profiles.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {profiles.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <button
                            onClick={() => loadProfile(p)}
                            className="flex-1 text-left text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors"
                          >
                            {p.name}
                          </button>
                          <button
                            onClick={() => deleteProfile(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* 右側：指數展示區塊 */}
          <div className="lg:col-span-8 space-y-6 font-sans">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-50 border-t-8 border-t-emerald-600 font-sans">
              <div className="flex flex-col gap-8 font-sans">
                
                {/* 第一層：雙指數 */}
                <div className="grid grid-cols-2 gap-8 border-b border-slate-50 pb-8 font-sans">
                   <div className="space-y-1 font-sans">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans font-sans">財運指數 (Wealth)</span>
                      <div className="flex items-baseline gap-1 font-sans font-sans font-sans font-sans"><span className={`text-6xl font-black tabular-nums leading-none ${getScoreVisuals(result?.wealthScore).color} font-sans`}>{result?.wealthScore}</span><span className="text-sm font-bold text-slate-200 font-sans">/100</span></div>
                   </div>
                   <div className="space-y-1 font-sans font-sans">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans font-sans font-sans">事業指數 (Career)</span>
                      <div className="flex items-baseline gap-1 font-sans font-sans font-sans font-sans font-sans"><span className={`text-6xl font-black tabular-nums leading-none ${getScoreVisuals(result?.careerScore).color} font-sans`}>{result?.careerScore}</span><span className="text-sm font-bold text-slate-200 font-sans">/100</span></div>
                   </div>
                </div>

                {/* 第二層：核心大勢（放在分數下方） */}
                {result && (
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4 font-sans font-sans">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 font-sans">
                      <div className="space-y-3 flex-1 font-sans text-center md:text-left font-sans">
                        <div className="flex items-center justify-center md:justify-start gap-3 text-emerald-600 font-sans font-sans">
                          <TrendingUp size={24}/>
                          <div className="text-sm font-black uppercase tracking-[0.2em] italic font-sans font-sans">核心大勢導航</div>
                        </div>
                        <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${result?.strategy?.bg} ${result?.strategy?.color} border border-current font-sans font-sans`}>
                          策略等級：{result?.strategy?.label}
                        </div>
                        <p className="text-3xl font-black text-slate-900 leading-relaxed italic font-serif font-serif">「{result.strategy.msg}」</p>
                      </div>
                      <div className="flex flex-wrap justify-center md:justify-end gap-2 max-w-[220px] font-sans font-sans">
                        {result.tags.map(t => (<span key={t} className={`px-3 py-1 rounded-xl text-[10px] font-black bg-white border shadow-sm font-sans ${t.includes('💀') || t.includes('🆘') || t.includes('⚔️') ? 'text-rose-600 border-rose-100' : 'text-slate-500 border-slate-100'}`}>{t}</span>))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex bg-slate-100 p-1.5 rounded-full border shadow-inner font-sans font-sans font-sans">
                  <button onClick={() => setViewMode('simple')} className={`flex-1 py-3 rounded-full text-[11px] font-black transition-all font-sans ${viewMode === 'simple' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>精要簡評</button>
                  <button onClick={() => setViewMode('detailed')} className={`flex-1 py-3 rounded-full text-[11px] font-black transition-all font-sans ${viewMode === 'detailed' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>大師學理</button>
                </div>

                <div className="font-serif font-serif font-serif">
                  {viewMode === 'simple' ? (
                    <div className="space-y-4 animate-in fade-in duration-500 font-serif font-serif font-serif">{analyses.simple.map((s, i) => (<div key={i} className={`p-6 rounded-3xl border-l-[12px] ${result.strategy.border} bg-slate-50 shadow-sm italic font-medium text-base font-serif font-serif font-serif font-serif`}>「{s}」</div>))}</div>
                  ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-5 font-serif font-serif font-serif">
                      {analyses.detailed.map((step, idx) => (
                        <div key={idx} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all font-serif font-serif">
                          <div className="flex items-center justify-between mb-4 font-sans font-sans">
                            <h4 className="font-black text-slate-900 text-lg italic flex items-center gap-3 font-sans font-sans"><span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black font-sans font-sans font-sans">{idx + 1}</span>{step.title}</h4>
                            <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase border bg-slate-50 font-sans font-sans">{step.impact}</span>
                          </div>
                          <p className="p-4 bg-slate-50/50 rounded-2xl border border-slate-50 italic text-slate-800 text-sm leading-relaxed font-serif font-serif">「{step.content}」</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 曆法：精簡格版 */}
        <section className="bg-white p-6 md:p-8 rounded-[3rem] shadow-sm border border-slate-100 font-sans">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-6 border-b pb-8 mb-8 font-sans font-sans">
            <div className="flex items-center gap-4 font-sans">
                <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg text-white font-sans font-sans"><CalendarDays size={28} /></div>
                <div className="font-sans font-sans">
                  <h2 className="text-3xl font-black text-slate-950 tracking-tighter font-sans font-sans">{monthlyOutlook.monthName} 機運曆</h2>
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black italic font-sans px-1">Emerald-Go / Rose-Stop Navigation</p>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-50 p-2 rounded-2xl border font-sans shadow-inner">
                <div className="flex items-center gap-1.5 mr-2 font-sans">
                  {['攻', '取', '觀', '避'].map(l => (
                    <button key={l} onClick={() => showFilteredList(l)} className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 text-[11px] font-black hover:bg-emerald-50 font-sans font-sans">
                      <div className={`w-2 h-2 rounded-full ${l === '攻' ? 'bg-emerald-500' : l === '取' ? 'bg-blue-500' : l === '觀' ? 'bg-amber-500' : 'bg-rose-500'} font-sans font-sans`}></div>{l}
                    </button>
                  ))}
                </div>
                <div className="w-px h-6 bg-slate-200 mx-1 hidden xl:block font-sans font-sans"></div>
                <div className="flex items-center gap-1.5 font-sans font-sans">
                  <button onClick={() => showFilteredList('官殺運')} className="px-4 py-2 bg-blue-600 rounded-xl text-white text-[11px] font-black shadow-md font-sans">官殺運</button>
                  <button onClick={() => showFilteredList('印星運')} className="px-4 py-2 bg-indigo-600 rounded-xl text-white text-[11px] font-black shadow-md font-sans">印星運</button>
                  <button onClick={() => showFilteredList('財運日')} className="px-4 py-2 bg-emerald-600 rounded-xl text-white text-[11px] font-black shadow-md font-sans">財運日</button>
                </div>
                <div className="flex gap-1.5 ml-4 font-sans font-sans">
                  <button onClick={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth()-1); setCalendarDate(d); }} className="p-2 hover:bg-white rounded-full border border-slate-200 transition-all shadow-sm font-sans font-sans font-sans"><ChevronLeft size={20} /></button>
                  <button onClick={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth()+1); setCalendarDate(d); }} className="p-2 hover:bg-white rounded-full border border-slate-200 transition-all shadow-sm font-sans font-sans font-sans"><ChevronRight size={20} /></button>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-3 font-sans">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (<div key={d} className="text-center font-black text-slate-300 uppercase py-2 tracking-[0.2em] text-[10px] font-sans font-sans font-sans font-sans">{d}</div>))}
            {monthlyOutlook.blanks.map((_, i) => <div key={`b-${i}`} className="h-40 md:h-48 bg-slate-50 opacity-10 rounded-3xl border border-dashed font-sans"></div>)}
            {monthlyOutlook.days.map((day, i) => (
              <button key={i} onClick={() => { setSelectedDate(day.fullDate); setModalDate(day.fullDate); }} className={`h-40 md:h-48 p-4 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between text-left font-sans font-sans ${selectedDate === day.fullDate ? 'ring-8 ring-emerald-500/5 border-emerald-600 z-10 bg-white shadow-xl' : 'bg-white border-slate-100 shadow-sm hover:shadow-lg'}`}>
                <div className="flex items-start justify-between relative z-10 font-sans">
                  <span className={`text-xl font-black ${selectedDate === day.fullDate ? 'text-emerald-700' : 'text-slate-900'} font-sans font-sans`}>{day.date}</span>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg border ${day.strategy.bg} ${day.strategy.color} border-current font-sans font-sans`}>{day.flowDay.pillar}</span>
                </div>
                
                <div className="space-y-3 relative z-10 font-sans font-sans">
                  <div className="flex flex-col gap-1 font-sans">
                    <div className="flex items-center justify-between font-sans"><span className="text-[9px] font-black text-slate-400 uppercase font-sans">財</span><span className={`text-sm font-black ${getScoreVisuals(day.wealthScore).color} font-sans`}>{day.wealthScore}</span></div>
                    <div className="flex items-center justify-between font-sans"><span className="text-[9px] font-black text-slate-400 uppercase font-sans">事</span><span className={`text-sm font-black ${getScoreVisuals(day.careerScore).color} font-sans`}>{day.careerScore}</span></div>
                  </div>
                  <div className={`text-[10px] font-bold leading-tight line-clamp-1 p-1.5 rounded-lg bg-slate-50 border border-slate-50 font-sans ${selectedDate === day.fullDate ? 'text-slate-950 font-sans' : 'text-slate-400'}`}>
                    {day.strategy.label} · {day.strategy.msg?.split('。')[0]}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 w-full h-1.5 flex bg-slate-100 shadow-inner font-sans">
                  <div className={`h-full transition-all duration-1000 ${getScoreVisuals(day.wealthScore).dot.replace('bg', 'bg')}`} style={{ width: `${day.wealthScore/2}%` }}></div>
                  <div className={`h-full transition-all duration-1000 ${getScoreVisuals(day.careerScore).dot.replace('bg', 'bg')}`} style={{ width: `${day.careerScore/2}%` }}></div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {modalDate && <DayModal />}
        {strategyList && <ListModal />}
        
        <footer className="text-center py-12 opacity-30 font-sans">
          <p className="text-[10px] font-black uppercase tracking-[0.8em] text-slate-400 font-sans">三十年命理智慧 · 雙軌精鍊導航 · v12.0</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
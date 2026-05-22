import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import {
  Users, UserCheck, UserMinus, BarChart2, PieChart, TrendingUp, TrendingDown,
  CheckCircle, XCircle, AlertCircle, Info, Table, Loader2, LayoutDashboard,
  ClipboardList, CalendarCheck, ChevronDown, LogOut, ChevronLeft, ChevronRight,
  RefreshCw, Edit3, Calendar, Filter, Check
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, Area, PieChart as RePieChart, Pie, Cell
} from 'recharts';

// ============================================
// ===== 案件設定（ここだけ変更してください） =====
// ============================================
const CONFIG = {
  TITLE: 'testai LINEダッシュボード',
  CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQiwOvB1RCZ38CYVdKK76XDKRQQv4XTpV56TpYVBCo6-AcRFWac7jESNNDkRf-iBLAlNEESY240sKhX/pub?gid=1072960483&single=true&output=csv',
  SHEET_URL: 'https://docs.google.com/spreadsheets/d/1I7TYT_ceamL0mt-U_8I12Q9S3FYTW6ejHSkHZAgzhrQ/edit',
  PROXY_URL: 'https://line-dashboard-proxy.raspy-wood-9b0d.workers.dev',
  GOOGLE_CLIENT_ID: '813216912152-hf6cden86ijta1qjc67uvscdlhmi85sl.apps.googleusercontent.com',
  SHEET_NAME: 'テスト用（触らない）'
};
// ============================================

const COLORS = { 
  primary: "#0067b8", secondary: "#00A4EF", success: "#107c10", 
  warning: "#ffb900", danger: "#d13438", info: "#0078d4", 
  muted: "#666666", accent: "#9bf00b",
  positive: "#0067b8", negative: "#d13438",
};
const PIE_COLORS = ["#0067b8", "#107c10", "#00A4EF", "#ffb900", "#d13438", "#0078d4", "#881798", "#00b294", "#e3008c", "#ff8c00", "#00188f"];

const getSheetId = (url: string) => {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : url;
};
const parseDate = (dateStr: any) => {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s) return null;
  const match = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (match) {
    const d = new Date(parseInt(match[1],10), parseInt(match[2],10)-1, parseInt(match[3],10));
    return isNaN(d.getTime()) ? null : d;
  }
  const normalized = s.replace(/^(\d{4}-\d{2}-\d{2})\s/, '$1T');
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
};
const formatMonth = (d: Date | null) => d ? `${d.getFullYear()}年${String(d.getMonth()+1).padStart(2,'0')}月` : null;
const formatDay = (d: Date | null) => d ? `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}` : null;
const hasTag = (val: any) => { if (!val) return false; const s = String(val).trim(); return s !== '' && s !== '0'; };
const isTrue = (val: any) => { if (!val) return false; const s = String(val).trim(); return s==='1'||s==='１'||s.toLowerCase()==='true'; };
const getFuzzyKey = (keys: string[], keywords: string[], exclude: string[]=[]) => keys.find(k => keywords.every(kw => k.includes(kw)) && !exclude.some(ex => k.includes(ex)));

const IconComp = ({ name, size=18, className="" }: any) => {
  const m: any = { 'users':Users,'user-check':UserCheck,'user-minus':UserMinus,
    'bar-chart-2':BarChart2,'pie-chart':PieChart,'trending-up':TrendingUp,
    'trending-down':TrendingDown,'check-circle':CheckCircle,'x-circle':XCircle,
    'alert-circle':AlertCircle,'info':Info,'table':Table,'loader-2':Loader2,
    'layout-dashboard':LayoutDashboard,'clipboard-list':ClipboardList,
    'calendar-check':CalendarCheck,'chevron-down':ChevronDown,'log-out':LogOut,
    'chevron-left':ChevronLeft,'chevron-right':ChevronRight,
    'refresh-cw':RefreshCw,'edit-3':Edit3,'calendar':Calendar,'filter':Filter };
  const I = m[name]; return I ? <I size={size} className={className}/> : null;
};

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="relative group inline-flex items-center ml-1.5 z-[100]">
    <Info size={14} className="text-[#666] cursor-help hover:text-[#0067b8] transition-colors"/>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-[320px] bg-[#1a1a1a] text-white text-[12px] p-3 rounded-lg shadow-xl whitespace-pre-wrap leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-[100]">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1a1a1a]"/>
    </div>
  </div>
);

const KPICard = ({ title, value, unit, icon, info, subText, change, changeLabel, isEditing }: any) => {
  const [editValue, setEditValue] = useState(value);
  useEffect(() => { setEditValue(value); }, [value]);
  return (
    <div className="card p-5 card-hover flex flex-col justify-between min-h-[120px]">
      <div className="flex justify-between items-start mb-3">
        <div className="p-2 rounded-lg bg-[#f2f2f2]">
          <IconComp name={icon} size={20} className="text-[#0067b8]"/>
        </div>
      </div>
      <div>
        <h3 className="text-[#666] text-[11px] font-semibold tracking-wide uppercase mb-1 flex items-center">
          {title}{info && <InfoTooltip text={info}/>}
        </h3>
        <div className="flex items-baseline gap-1.5">
          {isEditing ? (
            <input type="text" value={editValue} onChange={(e)=>setEditValue(e.target.value)} className="border border-blue-300 rounded px-2 w-24 text-[24px] font-bold" />
          ) : (
            <span className="text-[32px] font-bold text-[#000] tracking-tight leading-none">
              {typeof editValue==='number' ? editValue.toLocaleString() : editValue}
            </span>
          )}
          <span className="text-[#666] text-xs font-semibold">{unit}</span>
        </div>
        {change!=null && !isNaN(change) && isFinite(change) && (
          <div className="flex items-center gap-1 mt-1.5">
            <IconComp name={change>=0?'trending-up':'trending-down'} size={12} className={change>=0?'text-[#0067b8]':'text-[#d13438]'}/>
            <span className={`text-[11px] font-bold ${change>=0?'text-[#0067b8]':'text-[#d13438]'}`}>
              {change>=0?'+':''}{change}%
            </span>
            {changeLabel && <span className="text-[10px] text-[#666] ml-0.5">{changeLabel}</span>}
          </div>
        )}
        {change === null && (
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[11px] font-bold text-[#666]">―</span>
            {changeLabel && <span className="text-[10px] text-[#666] ml-0.5">{changeLabel}</span>}
          </div>
        )}
        {subText && <p className="text-[11px] text-[#666] mt-1">{subText}</p>}
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-4 rounded-lg shadow-xl border border-[#f2f2f2] text-xs">
      <p className="font-semibold text-[#000] mb-2 text-sm">{label}</p>
      {payload.map((e:any,i:number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{backgroundColor:e.color}}/>
          <span className="text-[#666]">{e.name}:</span>
          <span className="font-bold text-[#000]">{e.value?.toLocaleString()||0}{e.name.includes('率')?'%':''}</span>
        </div>
      ))}
    </div>
  );
};

const LoginScreen = ({ onLogin }: { onLogin: (t:string)=>void }) => {
  const loginRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const renderButton = () => {
      if ((window as any).google && loginRef.current) {
        (window as any).google.accounts.id.initialize({
          client_id: CONFIG.GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            localStorage.setItem('google_id_token', response.credential);
            onLogin(response.credential);
          },
        });
        (window as any).google.accounts.id.renderButton(loginRef.current, { theme: 'outline', size: 'large', width: 300 });
      }
    };
    if ((window as any).google) { renderButton(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = renderButton;
    document.head.appendChild(script);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-[24px] font-semibold mb-8">{CONFIG.TITLE}</h1>
      <div ref={loginRef}></div>
    </div>
  );
};

const isDeployed = window.location.hostname.includes('github.io');

function fetchViaCSV(csvUrl: string) {
  return new Promise<any[]>((resolve, reject) => {
    Papa.parse(csvUrl, { download:true, header:true, skipEmptyLines:true,
      transformHeader:(h)=>h.trim(),
      complete:(r)=>resolve(r.data), error:(e)=>reject(e) });
  });
}
async function fetchViaProxy() {
  const token = localStorage.getItem('google_id_token');
  const res = await fetch(`${CONFIG.PROXY_URL}/sheets`, {
    method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
    body: JSON.stringify({sheetId:getSheetId(CONFIG.SHEET_URL),sheetName:CONFIG.SHEET_NAME})
  });
  if (res.status === 401) {
    localStorage.removeItem('google_id_token');
    window.location.reload(); 
    return [];
  }
  if (res.status===403) throw new Error('アクセス権がありません。スプレッドシートの共有設定を確認してください。');
  const json = await res.json();
  if (!json.rows || !json.headers) throw new Error('レスポンス形式が不正です');
  return json.rows.map((row:any) => { const o:any={}; json.headers.forEach((h:any,i:number)=>{o[h]=row[i]||''}); return o; });
}
async function fetchSheetData() {
  if (isDeployed) return await fetchViaProxy();
  if (CONFIG.CSV_URL) return await fetchViaCSV(CONFIG.CSV_URL);
  return await fetchViaProxy();
}

const getCategory = (source: string) => {
  if (!source) return '不明';
  if (['b01_Googleリスティング', 'b02_Meta', 'b03_副業向け_好きな場所で好きな時間に'].includes(source)) return '広告流入';
  if (['Instagtam', 'Tiktok', 'X流入', 'n01_プレス記事→LP', 'y01_YouTube_REALVALUE', 'y04_YouTube_REALVALUE'].includes(source)) return 'オーガニック;流入';
  if (['スクール全体チラシ'].includes(source)) return 'その他';
  return '不明';
};

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!isDeployed || !!localStorage.getItem('google_id_token'));
  
  const [granularity, setGranularity] = useState<'month'|'week'|'day'>('month');
  const [weekStartDay, setWeekStartDay] = useState(1);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [tableMode, setTableMode] = useState<'period'|'source'|'category'>('period');

  const loadData = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const rows = await fetchSheetData();
      setData(rows || []);
    } catch (e:any) {
      setError(e.message || 'データ取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getWeekRangeCalculated = (d: Date | null, startDay: number) => {
    if (!d) return null;
    const day = d.getDay();
    const diff = (day - startDay + 7) % 7;
    const start = new Date(d); start.setDate(d.getDate() - diff);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const fmt = (dt: Date) => `${dt.getMonth()+1}月${dt.getDate()}日`;
    return `${start.getFullYear()}年${fmt(start)}〜${fmt(end)}`;
  };

  const { parsedData, headers, lastUpdateDate, availablePeriods, availableSources, dateKey, sourceKey, blockKey } = useMemo(() => {
    if (!data.length) return { parsedData: [], headers: [], lastUpdateDate: '-', availablePeriods: [], availableSources: [], dateKey: '', sourceKey: '', blockKey: '' };
    
    const keys = Object.keys(data[0]);
    const dKey = getFuzzyKey(keys, ['友だち追加'], ['最終']) || getFuzzyKey(keys, ['日時']) || keys.find(k=>k.includes('日')) || '';
    const sKey = getFuzzyKey(keys, ['流入経路名'], ['@', 'A', '1', '2']) || getFuzzyKey(keys, ['流入経路']) || '';
    const bKey = getFuzzyKey(keys, ['ブロック'], ['解除']) || '';

    const parsed = data.map(row => {
      const d = dKey ? parseDate(row[dKey]) : null;
      let period = null;
      if (d) {
        if (granularity==='month') period = formatMonth(d);
        else if (granularity==='week') period = getWeekRangeCalculated(d, weekStartDay);
        else period = formatDay(d);
      }
      return {
        ...row,
        _date: d,
        _period: period,
        _source: sKey ? String(row[sKey] || '').trim() : '',
        _category: sKey ? getCategory(String(row[sKey] || '').trim()) : '不明',
        _isActive: bKey ? (!isTrue(row[bKey])) : true
      };
    });

    const periods = Array.from(new Set(parsed.map(r => r._period).filter(Boolean))).sort();
    const sources = Array.from(new Set(parsed.map(r => r._source).filter(Boolean))).sort();
    
    let lastDate = '-';
    if (parsed.length) {
      const dates = parsed.map(r=>r._date).filter(Boolean).map((d:Date)=>d.getTime());
      if (dates.length) lastDate = formatDay(new Date(Math.max(...dates))) || '-';
    }
    
    return { parsedData: parsed, headers: keys, lastUpdateDate: lastDate, availablePeriods: periods, availableSources: sources, dateKey: dKey, sourceKey: sKey, blockKey: bKey };
  }, [data, granularity, weekStartDay]);

  useEffect(() => {
    setSelectedPeriods(availablePeriods);
  }, [availablePeriods]);
  useEffect(() => {
    if (availableSources.length > 0 && selectedSources.length === 0) {
      setSelectedSources(availableSources);
    }
  }, [availableSources]);

  const filteredData = useMemo(() => {
    return parsedData.filter(row => {
      // 期間フィルタ
      if (selectedPeriods.length > 0 && selectedPeriods.length !== availablePeriods.length) {
        if (!row._period || !selectedPeriods.includes(row._period)) return false;
      }
      // 流入経路フィルタ
      if (selectedSources.length > 0 && selectedSources.length !== availableSources.length) {
        if (!row._source || !selectedSources.includes(row._source)) return false;
      }
      return true;
    });
  }, [parsedData, selectedPeriods, selectedSources, availablePeriods, availableSources]);


  useEffect(() => {
    if (isLoggedIn) loadData();
  }, [isLoggedIn, loadData]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditing]);

  const metrics = useMemo(() => {
    if (!filteredData.length) return null;
    
    const totalUsers = filteredData.length;
    const activeUsers = filteredData.filter(r => r._isActive).length;
    const blockCount = totalUsers - activeUsers;
    const blockRate = totalUsers > 0 ? (blockCount / totalUsers * 100).toFixed(1) : '0.0';

    const cvCount = filteredData.filter(r => isTrue(r['面談予約済'])).length;
    const cvr = activeUsers > 0 ? (cvCount / activeUsers * 100).toFixed(1) : '0.0';

    const contractCount = filteredData.filter(r => isTrue(r['契約済'])).length;
    const contractRate = activeUsers > 0 ? (contractCount / activeUsers * 100).toFixed(1) : '0.0';

    const pushTarget = filteredData.filter(r => isTrue(r['シナリオ読了済'])).length;
    const pushTap = filteredData.filter(r => isTrue(r['プッシュ配信_タップ'])).length;
    const pushTapRate = pushTarget > 0 ? (pushTap / pushTarget * 100).toFixed(1) : '0.0';

    // リッチメニューは総登録数ベースの指示
    const rmTap = filteredData.filter(r => isTrue(r['リッチメニューから予約_タップ']) || isTrue(r['リッチメニュー_タップ']) || isTrue(r['予約_タップ'])).length;
    const rmTapRate = totalUsers > 0 ? (rmTap / totalUsers * 100).toFixed(1) : '0.0';

    let prevCvrChange = null;
    let prevRegChange = null;
    if (selectedPeriods.length > 0 && availablePeriods.length >= 2) {
      const currentPeriodsSorted = [...selectedPeriods].sort();
      const latestPeriod = currentPeriodsSorted[currentPeriodsSorted.length - 1];
      const latestIdx = availablePeriods.indexOf(latestPeriod);
      if (latestIdx > 0) {
        const prevPeriod = availablePeriods[latestIdx - 1];
        
        const curData = parsedData.filter(r => r._period === latestPeriod && (selectedSources.length === 0 || selectedSources.length === availableSources.length || selectedSources.includes(r._source)));
        const curTotal = curData.length;
        const curActive = curData.filter(r => r._isActive).length;
        const curCv = curData.filter(r => isTrue(r['面談予約済'])).length;
        const curCvr = curActive > 0 ? (curCv / curActive * 100) : 0;
        
        const pData = parsedData.filter(r => r._period === prevPeriod && (selectedSources.length === 0 || selectedSources.length === availableSources.length || selectedSources.includes(r._source)));
        const pTotal = pData.length;
        const pActive = pData.filter(r => r._isActive).length;
        const pCv = pData.filter(r => isTrue(r['面談予約済'])).length;
        const pCvr = pActive > 0 ? (pCv / pActive * 100) : 0;

        if (pTotal > 0) prevRegChange = Number(((curTotal - pTotal) / pTotal * 100).toFixed(1));
        if (pData.length > 0) prevCvrChange = Number((curCvr - pCvr).toFixed(1));
      }
    }

    const steps = ["登録直後", "2通目", "3通目", "4通目", "5通目", "6通目", "7通目", "8通目", "9通目", "10通目"];
    const funnelSteps = steps.map(step => {
      const targetCol = `${step}_対象者`;
      const tapCol = `${step}_タップ`;
      const targetCount = filteredData.filter(r => isTrue(r[targetCol])).length;
      const tapCount = filteredData.filter(r => isTrue(r[tapCol])).length;
      return {
        name: step,
        対象者: targetCount,
        タップ数: tapCount,
        タップ率: targetCount > 0 ? Number((tapCount / targetCount * 100).toFixed(1)) : 0
      };
    }).filter(s => s.対象者 > 0);

    let sourceStats: any = {};
    filteredData.forEach(r => {
      const s = r._source || '不明';
      if (!sourceStats[s]) sourceStats[s] = { count: 0, active: 0, cv: 0 };
      sourceStats[s].count++;
      if (r._isActive) sourceStats[s].active++;
      if (isTrue(r['面談予約済'])) sourceStats[s].cv++;
    });
    
    let bestSource = null;
    let bestCvr = 0;
    Object.keys(sourceStats).forEach(k => {
      if (sourceStats[k].count >= 3 && sourceStats[k].active > 0) {
        const c = sourceStats[k].cv / sourceStats[k].active * 100;
        if (c > bestCvr) { bestCvr = c; bestSource = k; }
      }
    });
    const bestSourceText = bestSource ? `${bestSource} (${bestCvr.toFixed(1)}%)` : null;

    const trendData = selectedPeriods.map(period => {
      const pData = filteredData.filter(r => r._period === period);
      const pActive = pData.filter(r => r._isActive).length;
      const pCv = pData.filter(r => isTrue(r['面談予約済'])).length;
      const pTapCount = pData.filter(r => isTrue(r['登録直後_タップ'])).length;
      const pTargetCount = pData.filter(r => isTrue(r['登録直後_対象者'])).length;
      return {
        name: period,
        流入数: pData.length,
        CV数: pCv,
        成約率: pActive > 0 ? Number((pCv / pActive * 100).toFixed(1)) : 0,
        タップ率: pTargetCount > 0 ? Number((pTapCount / pTargetCount * 100).toFixed(1)) : 0
      };
    });

    return { totalUsers, activeUsers, blockCount, blockRate, cvCount, cvr, contractCount, contractRate, pushTarget, pushTap, pushTapRate, rmTap, rmTapRate, prevCvrChange, prevRegChange, funnelSteps, bestSourceText, trendData, sourceStats };
  }, [filteredData, parsedData, selectedPeriods, availablePeriods, selectedSources, availableSources]);

  const matrixData = useMemo(() => {
    const steps = ["登録直後", "2通目", "3通目", "4通目", "5通目", "6通目", "7通目", "8通目", "9通目", "10通目"];
    
    let rowKeys: string[] = [];
    if (tableMode === 'period') {
      rowKeys = [...selectedPeriods].sort((a,b)=>a.localeCompare(b));
    } else if (tableMode === 'source') {
      rowKeys = Array.from(new Set(filteredData.map(r=>r._source||'不明'))).sort();
    } else {
      rowKeys = Array.from(new Set(filteredData.map(r=>r._category||'不明'))).sort();
    }

    const generateRow = (key: string, isTotal: boolean) => {
      const fData = isTotal ? filteredData : filteredData.filter(r => {
        if (tableMode === 'period') return r._period === key;
        if (tableMode === 'source') return (r._source||'不明') === key;
        if (tableMode === 'category') return (r._category||'不明') === key;
        return false;
      });
      const active = fData.filter(r => r._isActive).length;
      const cv = fData.filter(r => isTrue(r['面談予約済'])).length;
      
      const stepStats = steps.map(step => {
        const t = fData.filter(r => isTrue(r[`${step}_対象者`])).length;
        const tap = fData.filter(r => isTrue(r[`${step}_タップ`])).length;
        return { Target: t, Tap: tap, Rate: t > 0 ? (tap/t*100) : 0 };
      });
      return { key, stepStats, totalCv: cv, totalActive: active, totalRate: active > 0 ? (cv/active*100) : 0 };
    };

    const rows = rowKeys.map(k => generateRow(k, false));
    const totalRow = generateRow('合計', true);
    
    return { rows, totalRow, steps };
  }, [filteredData, tableMode, selectedPeriods]);

  if (!isLoggedIn) return <LoginScreen onLogin={(t)=>{setIsLoggedIn(true);}}/>;

  return (
    <div className="p-6 bg-[#ffffff] min-h-screen text-[#000000]">
      {isLoading ? <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin mr-2" size={24}/>データを読み込み中...</div> : error ? <div className="text-red-500 p-20 text-center">{error}</div> : (
        <div className="max-w-[1400px] mx-auto animate-fadeIn pb-20">
          <header className="flex justify-between items-center mb-6">
            <div className="flex items-end gap-4">
              <h1 className="text-[24px] font-semibold flex items-center gap-2"><LayoutDashboard size={24} className="text-[#0067b8]"/>{CONFIG.TITLE}</h1>
              <span className="text-[#666] text-sm font-medium pb-1 flex items-center gap-1.5"><CalendarCheck size={16}/>有効データ最終日: {lastUpdateDate}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className={`flex items-center gap-1.5 px-3 py-1.5 ${isEditing ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-[#f2f2f2] hover:bg-[#e6e6e6]'} rounded text-sm font-semibold transition-colors`} onClick={()=>setIsEditing(!isEditing)}>
                <Edit3 size={16}/> {isEditing ? '編集終了' : '編集モード'}
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0067b8] text-white hover:bg-[#005a9e] rounded text-sm font-semibold transition-colors" onClick={loadData}>
                <RefreshCw size={16}/> データ更新
              </button>
              {isDeployed && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-black transition-colors" onClick={()=>{localStorage.removeItem('google_id_token');setIsLoggedIn(false);}}>
                  <LogOut size={16}/>
                </button>
              )}
            </div>
          </header>
          {isEditing && <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6 sticky top-0 z-50 shadow-sm rounded"><p className="text-yellow-700 text-sm font-bold flex items-center gap-2"><AlertCircle size={16}/> 編集モード: 主要数値を直接クリックして書き換えられます。変更は保存されずリロードで元に戻ります</p></div>}
          
          <div className="card p-4 mb-6 flex flex-wrap gap-6 items-center bg-[#f9f9f9]">
            <div className="flex flex-col gap-2 relative group z-30">
              <span className="text-[11px] font-bold text-[#666] uppercase tracking-wider">表示粒度</span>
              <div className="flex bg-white border border-[#d2d2d2] rounded p-1">
                {[{id:'month',label:'月次'},{id:'week',label:'週次'},{id:'day',label:'日次'}].map(o => (
                  <button key={o.id} onClick={()=>setGranularity(o.id as any)} className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${granularity===o.id ? 'bg-[#0067b8] text-white' : 'text-[#666] hover:bg-[#f2f2f2]'}`}>{o.label}</button>
                ))}
              </div>
            </div>
            {granularity === 'week' && (
              <div className="flex flex-col gap-2 z-30">
                <span className="text-[11px] font-bold text-[#666] uppercase tracking-wider">週の開始曜</span>
                <select value={weekStartDay} onChange={e=>setWeekStartDay(Number(e.target.value))} className="border border-[#d2d2d2] rounded px-3 py-1.5 text-sm bg-white outline-none">
                  {['日','月','火','水','木','金','土'].map((d,i)=><option key={i} value={i}>{d}曜日</option>)}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-2 relative group z-20">
              <span className="text-[11px] font-bold text-[#666] uppercase tracking-wider">期間フィルタ (複数選択OK)</span>
              <div className="relative">
                <button className="border border-[#d2d2d2] rounded px-4 py-1.5 text-sm bg-white flex items-center justify-between w-48 font-medium">
                  {selectedPeriods.length === availablePeriods.length ? '全期間' : `${selectedPeriods.length}件選択中`}
                  <ChevronDown size={14} className="text-[#666] ml-2"/>
                </button>
                <div className="absolute top-full left-0 mt-1 bg-white border border-[#d2d2d2] rounded shadow-xl hidden group-hover:block w-64 max-h-64 overflow-y-auto">
                  <label className="flex items-center gap-2 p-3 hover:bg-[#f2f2f2] cursor-pointer border-b border-[#f2f2f2]">
                    <input type="checkbox" checked={selectedPeriods.length===availablePeriods.length} onChange={(e) => setSelectedPeriods(e.target.checked ? availablePeriods : [])} className="w-4 h-4 rounded" />
                    <span className="text-sm font-bold text-gray-900">全選択</span>
                  </label>
                  {availablePeriods.map(p => (
                    <label key={p} className="flex items-center gap-2 px-3 py-2 hover:bg-[#f2f2f2] cursor-pointer text-sm">
                      <input type="checkbox" checked={selectedPeriods.includes(p)} onChange={(e) => {
                        if (e.target.checked) setSelectedPeriods([...selectedPeriods, p]);
                        else setSelectedPeriods(selectedPeriods.filter(x => x !== p));
                      }} className="w-4 h-4 rounded" />
                      <span className="truncate">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 relative group z-10 w-48">
              <span className="text-[11px] font-bold text-[#666] uppercase tracking-wider">流入経路 (複数選択OK)</span>
              <div className="relative">
                <button className="border border-[#d2d2d2] rounded px-4 py-1.5 text-sm bg-white flex items-center justify-between w-full font-medium truncate">
                  <span className="truncate">{selectedSources.length === availableSources.length ? 'すべての経路' : `${selectedSources.length}件選択中`}</span>
                  <ChevronDown size={14} className="text-[#666] ml-2 flex-shrink-0"/>
                </button>
                <div className="absolute top-full left-0 mt-1 bg-white border border-[#d2d2d2] rounded shadow-xl hidden group-hover:block w-80 max-h-96 overflow-y-auto">
                  <label className="flex items-center gap-2 p-3 hover:bg-[#f2f2f2] cursor-pointer border-b border-[#f2f2f2]">
                    <input type="checkbox" checked={selectedSources.length===availableSources.length && availableSources.length > 0} onChange={(e) => setSelectedSources(e.target.checked ? availableSources : [])} className="w-4 h-4" />
                    <span className="text-sm font-bold text-gray-900">すべて</span>
                  </label>
                  {availableSources.map(s => (
                    <label key={s} className="flex items-center justify-between px-3 py-2 hover:bg-[#f2f2f2] cursor-pointer text-sm border-b border-[#f9f9f9]">
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-4">
                        <input type="checkbox" checked={selectedSources.includes(s)} onChange={(e) => {
                          if(e.target.checked) setSelectedSources([...selectedSources, s]);
                          else setSelectedSources(selectedSources.filter(x=>x!==s));
                        }} className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate" title={s}>{s}</span>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap">{getCategory(s)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            {metrics?.bestSourceText && (
              <div className="ml-auto flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-xs font-bold text-blue-800">🏆 成約率最高: {metrics.bestSourceText}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            <KPICard title="総登録数" value={metrics?.totalUsers} unit="人" icon="users" change={metrics?.prevRegChange} changeLabel={granularity==='month'?'前月比':granularity==='week'?'前週比':'前日比'} isEditing={isEditing} info="すべての行数（ブロック含む）" />
            <KPICard title="アクティブ数" value={metrics?.activeUsers} unit="人" icon="user-check" subText={`ブロック率 ${metrics?.blockRate}%`} isEditing={isEditing} info="「ユーザーブロック」が1またはTrueではない総数" />
            <KPICard title="面談予約 (CV)" value={metrics?.cvCount} unit="件" icon="check-circle" change={metrics?.prevCvrChange} changeLabel={`${granularity==='month'?'前月比':granularity==='week'?'前週比':'前日比'} (pt)`} isEditing={isEditing} info="「面談予約済」の数" />
            <KPICard title="成約率" value={metrics?.cvr} unit="%" icon="pie-chart" change={metrics?.prevCvrChange} changeLabel={`pt`} isEditing={isEditing} info="面談予約 / アクティブ数 × 100" />
            <KPICard title="契約実績" value={metrics?.contractCount} unit="件" icon="clipboard-list" subText={`契約率 ${metrics?.contractRate}%`} isEditing={isEditing} info="「契約済」の数" />
            <KPICard title="プッシュ配信タップ" value={metrics?.pushTap} unit="件" icon="bar-chart-2" subText={`タップ率 ${metrics?.pushTapRate}%`} isEditing={isEditing} info="プッシュ配信_タップ / シナリオ読了済(対象者) × 100" />
            <KPICard title="リッチメニュータップ" value={metrics?.rmTap} unit="件" icon="LayoutDashboard" subText={`タップ率 ${metrics?.rmTapRate}%`} isEditing={isEditing} info="リッチメニューから予約_タップ / 総登録数 × 100" />
          </div>

          <div className="card p-0 mb-8 overflow-hidden flex flex-col">
            <div className="bg-[#f2f2f2] px-6 py-4 flex items-center gap-4 border-b border-[#e5e5e5]">
              <h2 className="text-sm font-bold text-[#000] flex items-center gap-2"><Table size={18} className="text-[#0067b8]"/>ファネル集計マトリクス</h2>
              <div className="bg-white rounded border border-[#d2d2d2] flex overflow-hidden ml-auto">
                {[{id:'period',l:'期間ごと'},{id:'source',l:'経路ごと'},{id:'category',l:'分類ごと'}].map(o =>(
                  <button key={o.id} onClick={()=>setTableMode(o.id as any)} className={`px-4 py-1.5 text-xs font-semibold transition-colors ${tableMode===o.id?'bg-[#0067b8] text-white':'hover:bg-[#f9f9f9] text-[#666]'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm text-left min-w-[max-content]">
                <thead className="bg-[#fafafa] border-b-2 border-[#d2d2d2] text-[#666]">
                  <tr>
                    <th className="sticky left-0 bg-[#fafafa] z-10 px-4 pt-3 pb-1 border-r-2 border-[#d2d2d2] w-40 align-bottom" rowSpan={2}>
                      {tableMode==='period'?'期間':tableMode==='source'?'流入経路':'流入分類'}
                    </th>
                    {matrixData.steps.map((st, i) => (
                      <th key={i} colSpan={3} className={`px-2 pt-2 border-b border-[#e5e5e5] text-center font-bold pb-1 ${i>0 ? 'border-l-2 border-[#e5e5e5]' : ''}`}>{st}</th>
                    ))}
                    <th colSpan={3} className="px-4 pt-2 border-b border-[#e5e5e5] text-center font-bold border-l-2 border-[#d2d2d2]">全体成果</th>
                  </tr>
                  <tr>
                    {matrixData.steps.map((st, i) => (
                      <React.Fragment key={i}>
                        <th className={`px-2 py-2 text-xs font-medium text-center ${i>0 ? 'border-l-2 border-[#e5e5e5]' : ''}`}>対象</th>
                        <th className="px-2 py-2 text-xs font-medium text-center">tap</th>
                        <th className="px-2 py-2 text-xs font-medium text-center">tap率</th>
                      </React.Fragment>
                    ))}
                    <th className="px-4 py-2 text-xs font-bold text-center border-l-2 border-[#d2d2d2]">ｱｸﾃｨﾌﾞ数</th>
                    <th className="px-4 py-2 text-xs font-bold text-center">CV数</th>
                    <th className="px-4 py-2 text-xs font-bold text-center">成約率</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-[#f0f7ff] border-b-2 border-[#d2d2d2] font-semibold text-[#000]">
                    <td className="sticky left-0 bg-[#f0f7ff] z-10 px-4 py-3 border-r-2 border-[#d2d2d2]">合計</td>
                    {matrixData.totalRow.stepStats.map((s, i) => (
                      <React.Fragment key={i}>
                        <td className={`px-2 py-3 text-center ${i>0 ? 'border-l-2 border-[#e5e5e5]' : ''}`}>{s.Target.toLocaleString()}</td>
                        <td className="px-2 py-3 text-center">{s.Tap.toLocaleString()}</td>
                        <td className={`px-2 py-3 text-center ${s.Rate>=30?'text-[#0067b8]':s.Rate>0?'text-[#666]':''}`}>{s.Rate>0?s.Rate.toFixed(1)+'%':'-'}</td>
                      </React.Fragment>
                    ))}
                    <td className="px-4 py-3 text-center border-l-2 border-[#d2d2d2] text-[#0067b8] text-base">{matrixData.totalRow.totalActive.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-[#0067b8] text-base">{matrixData.totalRow.totalCv.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-[#0067b8] text-base">{matrixData.totalRow.totalRate>0?matrixData.totalRow.totalRate.toFixed(1)+'%':'-'}</td>
                  </tr>
                  {matrixData.rows.map((row, i) => (
                    <tr key={i} className="border-b border-[#f2f2f2] hover:bg-[#fcfcfc] transition-colors">
                      <td className="sticky left-0 bg-white group-hover:bg-[#fcfcfc] z-10 px-4 py-2.5 border-r-2 border-[#d2d2d2] font-medium text-[#333] truncate max-w-[200px]" title={row.key}>{row.key}</td>
                      {row.stepStats.map((s, j) => (
                        <React.Fragment key={j}>
                          <td className={`px-2 py-2.5 text-center text-gray-600 ${j>0 ? 'border-l-2 border-[#e5e5e5]' : ''}`}>{s.Target>0?s.Target.toLocaleString():''}</td>
                          <td className="px-2 py-2.5 text-center text-gray-600">{s.Tap>0?s.Tap.toLocaleString():''}</td>
                          <td className={`px-2 py-2.5 text-center text-xs ${s.Rate>=30?'font-bold text-[#0067b8]':s.Rate>0?'text-gray-500':''}`}>{s.Rate>0?s.Rate.toFixed(1)+'%':''}</td>
                        </React.Fragment>
                      ))}
                      <td className="px-4 py-2.5 text-center border-l-2 border-[#d2d2d2] text-gray-600">{row.totalActive>0?row.totalActive.toLocaleString():''}</td>
                      <td className="px-4 py-2.5 text-center font-bold">{row.totalCv>0?row.totalCv.toLocaleString():''}</td>
                      <td className="px-4 py-2.5 text-center font-bold">{row.totalRate>0?row.totalRate.toFixed(1)+'%':''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card p-6 h-[400px]">
              <h2 className="text-[14px] font-bold text-[#000] mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-[#0067b8]"/>{granularity==='month'?'月次':granularity==='week'?'週次':'日次'}別 トレンドレポート</h2>
              <ResponsiveContainer width="100%" height="85%">
                <ComposedChart data={metrics?.trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2f2f2" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#666', fontSize:12, fontWeight:500}} dy={10}/>
                  <YAxis yAxisId="left" hide />
                  <YAxis yAxisId="right" orientation="right" hide />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize:12, fontWeight:600, color:'#666'}}/>
                  <Bar dataKey="流入数" fill="#f2f2f2" radius={[4,4,0,0]} yAxisId="left" barSize={40} />
                  <Bar dataKey="CV数" fill={COLORS.primary} radius={[4,4,0,0]} yAxisId="left" barSize={40} />
                  <Line type="monotone" dataKey="成約率" stroke={COLORS.danger} strokeWidth={3} dot={{r:4, fill:COLORS.danger, strokeWidth:0}} yAxisId="right" />
                  <Line type="monotone" dataKey="タップ率" stroke={COLORS.success} strokeWidth={3} dot={{r:4, fill:COLORS.success, strokeWidth:0}} yAxisId="right" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            <div className="card p-6 h-[400px]">
              <h2 className="text-[14px] font-bold text-[#000] mb-4 flex items-center gap-2"><BarChart2 size={18} className="text-[#0067b8]"/>シナリオ別 タップ落ち率</h2>
              <ResponsiveContainer width="100%" height="85%">
                <ComposedChart data={metrics?.funnelSteps} layout="vertical" margin={{left:20}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f2f2f2" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill:'#000', fontSize:12, fontWeight:600}} width={80}/>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="対象者" fill="#f2f2f2" radius={[0,4,4,0]} barSize={20} />
                  <Bar dataKey="タップ数" fill={COLORS.primary} radius={[0,4,4,0]} barSize={20} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
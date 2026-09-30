import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Coins, 
  Download, 
  RotateCcw, 
  Check, 
  Sparkles,
  Lock,
  Unlock,
  ShieldCheck,
  Type,
  SunMedium,
  KeyRound,
  X,
  AlertCircle,
  FileCode2,
  FileSpreadsheet,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Users,
  ChevronDown
} from 'lucide-react';
import type { Trip } from '../types';
import { 
  getStoredFirebaseConfig, 
  initFirebase, 
  type FirebaseCustomConfig 
} from '../services/firebase';
import { 
  getStoredGeminiApiKey, 
  setStoredGeminiApiKey 
} from '../services/ocr';
import { fetchGasConfig } from '../services/sheets';
import { 
  loadExchangeRates, 
  saveExchangeRates, 
  DEFAULT_EXCHANGE_RATES,
  INITIAL_SAMPLE_TRIP,
  INITIAL_SAMPLE_ITINERARY,
  INITIAL_SAMPLE_EXPENSES,
  saveTrips,
  saveItineraryItems,
  saveExpenses
} from '../services/storage';

interface SettingsTabProps {
  trip?: Trip;
  trips?: Trip[];
  onSelectTrip?: (tripId: string) => void;
  onEditTrip?: (trip: Trip) => void;
  onDeleteTrip?: (trip: Trip) => void;
  onOpenNewTripModal?: () => void;
  onUpdateTrip?: (updatedTrip: Trip) => void;
  onReloadAllData: () => void;
  isFirebaseConnected: boolean;
  setIsFirebaseConnected: (val: boolean) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  trip,
  trips,
  onSelectTrip,
  onEditTrip,
  onDeleteTrip,
  onOpenNewTripModal,
  onUpdateTrip,
  onReloadAllData,
  isFirebaseConnected,
  setIsFirebaseConnected,
}) => {
  // --- ACCESSIBILITY STATES (User Facing - Iron Rule 1 in pm-skills) ---
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>(() => {
    return (localStorage.getItem('giratrip_font_size') as 'normal' | 'large' | 'xlarge') || 'normal';
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('giratrip_high_contrast') === 'true';
  });

  const [activeAccent, setActiveAccent] = useState<string>(() => {
    return localStorage.getItem('giratrip_theme_accent') || 'pine';
  });

  // --- ADMIN SECURITY & AUTH STATES (Role-Based Access Control) ---
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('giratrip_admin_unlocked') === 'true';
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Firebase configuration form (Admin only)
  const storedConfig = getStoredFirebaseConfig();
  const [apiKey, setApiKey] = useState(storedConfig?.apiKey || '');
  const [projectId, setProjectId] = useState(storedConfig?.projectId || '');
  const [appId, setAppId] = useState(storedConfig?.appId || '');
  const [firebaseStatusMsg, setFirebaseStatusMsg] = useState<string | null>(null);

  // Google Apps Script Cloud Sync (Admin only)
  const [gasUrl, setGasUrl] = useState(() => {
    return trip?.sheetCsvUrl || localStorage.getItem('giratrip_gas_url') || '';
  });
  const [gasSyncLoading, setGasSyncLoading] = useState(false);
  const [gasSyncStatus, setGasSyncStatus] = useState<string | null>(null);

  // Gemini API key (Admin only)
  const [geminiKeyInput, setGeminiKeyInput] = useState(getStoredGeminiApiKey());
  const [geminiSaved, setGeminiSaved] = useState(false);

  // Exchange rates
  const [rates, setRates] = useState<Record<string, number>>(loadExchangeRates());
  const [ratesSaved, setRatesSaved] = useState(false);

  // Auto-sync trip sheet URL into gasUrl
  useEffect(() => {
    if (trip?.sheetCsvUrl && !gasUrl) {
      setGasUrl(trip.sheetCsvUrl);
    }
  }, [trip?.sheetCsvUrl]);

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
  };

  // Synchronize CSS attributes on root document
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', activeAccent);
    document.documentElement.setAttribute('data-font-size', fontSize);
    document.documentElement.setAttribute('data-high-contrast', String(highContrast));
  }, [activeAccent, fontSize, highContrast]);

  const handleSelectAccent = (accent: string) => {
    setActiveAccent(accent);
    localStorage.setItem('giratrip_theme_accent', accent);
  };

  const handleSelectFontSize = (size: 'normal' | 'large' | 'xlarge') => {
    setFontSize(size);
    localStorage.setItem('giratrip_font_size', size);
  };

  const handleToggleHighContrast = () => {
    const nextVal = !highContrast;
    setHighContrast(nextVal);
    localStorage.setItem('giratrip_high_contrast', String(nextVal));
  };

  // Google Sheet-Driven Master PIN Check & Cloud Keys Sync
  const handleUnlockAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPinInput.trim()) {
      setPinError('請輸入管理者通行密碼');
      return;
    }

    const targetGasUrl = gasUrl.trim() || trip?.sheetCsvUrl?.trim() || '';

    // 1. 若有試算表 GAS 網址，直接連線試算表驗證 AdminPin 與同步金鑰
    if (targetGasUrl && targetGasUrl.includes('script.google.com')) {
      setGasSyncLoading(true);
      setPinError(null);
      try {
        const res = await fetchGasConfig(targetGasUrl, adminPinInput.trim());
        if (res.status === 'success' && res.authorized && res.role === 'admin') {
          setIsAdminUnlocked(true);
          sessionStorage.setItem('giratrip_admin_unlocked', 'true');
          sessionStorage.setItem('giratrip_session_pin', adminPinInput.trim());
          localStorage.setItem('giratrip_gas_url', targetGasUrl);
          localStorage.setItem('giratrip_master_pin', adminPinInput.trim());

          // 從 Google 試算表載入並配置 Firebase 金鑰
          if (res.config?.firebase && res.config.firebase.apiKey) {
            setApiKey(res.config.firebase.apiKey);
            setProjectId(res.config.firebase.projectId || '');
            setAppId(res.config.firebase.appId || '');
            const newConfig: FirebaseCustomConfig = {
              apiKey: res.config.firebase.apiKey,
              projectId: res.config.firebase.projectId,
              authDomain: `${res.config.firebase.projectId}.firebaseapp.com`,
              appId: res.config.firebase.appId || '1:giratrip:web:demo',
            };
            localStorage.setItem('giratrip_firebase_config', JSON.stringify(newConfig));
            const ok = initFirebase(newConfig);
            setIsFirebaseConnected(ok);
          }

          // 從 Google 試算表載入並配置 Gemini Key
          if (res.config?.geminiApiKey) {
            setGeminiKeyInput(res.config.geminiApiKey);
            setStoredGeminiApiKey(res.config.geminiApiKey);
          }

          // 同步試算表成員名單與權限 (Role-Based Access Control)
          if (res.config?.members && res.config.members.length > 0 && onUpdateTrip && trip) {
            onUpdateTrip({
              ...trip,
              members: res.config.members,
              sheetCsvUrl: targetGasUrl,
              updatedAt: new Date().toISOString(),
            });
          }

          setShowPinModal(false);
          setAdminPinInput('');
          setGasSyncStatus('已成功通過 Google 試算表管理者密碼驗證，並同步載入金鑰與權限設定！');
          return;
        } else {
          setPinError('密碼錯誤！無法解鎖。請確認試算表「權限與金鑰」工作表中的 AdminPin。');
          return;
        }
      } catch (err: any) {
        setPinError(`無法連線至 Google 試算表 (${err.message})。請確認 Apps Script 部署存取權已設為「所有人 (Anyone)」。`);
        return;
      } finally {
        setGasSyncLoading(false);
      }
    }

    // 2. 本機備用通行碼驗證 (尚未配置試算表時)
    const masterPin = localStorage.getItem('giratrip_master_pin') || 'giratrip888';
    if (adminPinInput.trim() === masterPin) {
      setIsAdminUnlocked(true);
      sessionStorage.setItem('giratrip_admin_unlocked', 'true');
      setShowPinModal(false);
      setAdminPinInput('');
      setPinError(null);
    } else {
      setPinError('密碼錯誤！若尚未綁定試算表，預設密碼為 giratrip888；若已綁定，請確認試算表中的 AdminPin。');
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('giratrip_admin_unlocked');
    sessionStorage.removeItem('giratrip_session_pin');
  };

  // 重新從試算表載入最新金鑰與權限
  const handleRefreshFromGas = async () => {
    const targetGasUrl = gasUrl.trim() || trip?.sheetCsvUrl?.trim() || '';
    if (!targetGasUrl) {
      setGasSyncStatus('尚未設定 Google Apps Script 網址');
      return;
    }
    const currentPin = sessionStorage.getItem('giratrip_session_pin') || localStorage.getItem('giratrip_master_pin') || 'giratrip888';
    setGasSyncLoading(true);
    setGasSyncStatus(null);
    try {
      const res = await fetchGasConfig(targetGasUrl, currentPin);
      if (res.status === 'success' && res.authorized && res.role === 'admin') {
        if (res.config?.firebase && res.config.firebase.apiKey) {
          setApiKey(res.config.firebase.apiKey);
          setProjectId(res.config.firebase.projectId || '');
          setAppId(res.config.firebase.appId || '');
          const newConfig: FirebaseCustomConfig = {
            apiKey: res.config.firebase.apiKey,
            projectId: res.config.firebase.projectId,
            authDomain: `${res.config.firebase.projectId}.firebaseapp.com`,
            appId: res.config.firebase.appId || '1:giratrip:web:demo',
          };
          localStorage.setItem('giratrip_firebase_config', JSON.stringify(newConfig));
          const ok = initFirebase(newConfig);
          setIsFirebaseConnected(ok);
        }
        if (res.config?.geminiApiKey) {
          setGeminiKeyInput(res.config.geminiApiKey);
          setStoredGeminiApiKey(res.config.geminiApiKey);
        }
        if (res.config?.members && res.config.members.length > 0 && onUpdateTrip && trip) {
          onUpdateTrip({
            ...trip,
            members: res.config.members,
            sheetCsvUrl: targetGasUrl,
            updatedAt: new Date().toISOString(),
          });
        }
        setGasSyncStatus('已成功從 Google 試算表重新整理並確認最新金鑰與成員權限！');
      } else {
        setGasSyncStatus('試算表密碼已變更，請重新上鎖並以新密碼解鎖驗證！');
      }
    } catch (err: any) {
      setGasSyncStatus(`連線失敗: ${err.message}`);
    } finally {
      setGasSyncLoading(false);
    }
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projectId.trim()) {
      setFirebaseStatusMsg('請至少填寫 API Key 與 Project ID');
      return;
    }

    const newConfig: FirebaseCustomConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: `${projectId.trim()}.firebaseapp.com`,
      appId: appId.trim() || '1:giratrip:web:demo',
    };

    localStorage.setItem('giratrip_firebase_config', JSON.stringify(newConfig));
    const ok = initFirebase(newConfig);
    setIsFirebaseConnected(ok);
    setFirebaseStatusMsg(ok ? 'Firebase 連線成功！開啟 App 即時秒同步！' : '連線初始化異常，已切回本機 Local-First 模式');
  };

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredGeminiApiKey(geminiKeyInput.trim());
    setGeminiSaved(true);
    setTimeout(() => setGeminiSaved(false), 2000);
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    saveExchangeRates(rates);
    setRatesSaved(true);
    setTimeout(() => setRatesSaved(false), 2000);
  };

  const handleExportBackup = () => {
    const backupData = {
      trips: localStorage.getItem('giratrip_trips_v1'),
      activeTripId: localStorage.getItem('giratrip_active_trip_id_v1'),
      rates: localStorage.getItem('giratrip_custom_rates_v1'),
      themeAccent: activeAccent,
      fontSize: fontSize,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giratrip_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetSampleData = () => {
    if (window.confirm('確定要重置為長頸鹿官方預設的「東京賞櫻五日遊」範例旅程嗎？現有本機資料將被覆蓋。')) {
      saveTrips([INITIAL_SAMPLE_TRIP]);
      saveItineraryItems(INITIAL_SAMPLE_TRIP.id, INITIAL_SAMPLE_ITINERARY);
      saveExpenses(INITIAL_SAMPLE_TRIP.id, INITIAL_SAMPLE_EXPENSES);
      onReloadAllData();
      alert('已重置為官方示範資料！');
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* CARD 1: Accessibility & Font Scaling (Iron Rule 1 in pm-skills) */}
      <div className="bg-surface rounded-3xl border border-surface-border p-5 shadow-tactile space-y-3.5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-extrabold text-ink">無障礙字體與版面閱讀</h3>
          </div>
          <span className="text-[10px] font-bold text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            使用者專屬偏好
          </span>
        </div>

        <p className="text-[11px] text-ink-muted leading-relaxed font-medium">
          專為戶外旅行走動與不同閱讀習慣設計。字體放大時介面自動彈性自適應，按鈕維持 44px 以上舒適防手抖熱區：
        </p>

        {/* Font Size Selector (Min height 44px) */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleSelectFontSize('normal')}
            className={`min-h-[44px] px-3 py-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
              fontSize === 'normal'
                ? 'bg-surface border-primary text-primary font-bold shadow-tactile ring-2 ring-primary/20'
                : 'bg-canvas border-surface-border text-ink hover:bg-surface shadow-tactile-sm'
            }`}
          >
            <span className="text-xs">標準大小</span>
            <span className="text-[10px] text-ink-muted font-mono mt-0.5">100% (16px)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectFontSize('large')}
            className={`min-h-[44px] px-3 py-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
              fontSize === 'large'
                ? 'bg-surface border-primary text-primary font-bold shadow-tactile ring-2 ring-primary/20'
                : 'bg-canvas border-surface-border text-ink hover:bg-surface shadow-tactile-sm'
            }`}
          >
            <span className="text-sm font-semibold">舒適放大</span>
            <span className="text-[10px] text-ink-muted font-mono mt-0.5">112% (18px)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectFontSize('xlarge')}
            className={`min-h-[44px] px-3 py-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
              fontSize === 'xlarge'
                ? 'bg-surface border-primary text-primary font-bold shadow-tactile ring-2 ring-primary/20'
                : 'bg-canvas border-surface-border text-ink hover:bg-surface shadow-tactile-sm'
            }`}
          >
            <span className="text-base font-bold">清晰大字</span>
            <span className="text-[10px] text-ink-muted font-mono mt-0.5">125% (20px)</span>
          </button>
        </div>

        {/* High Contrast Toggle Button (min-h-[44px]) */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleToggleHighContrast}
            className={`w-full min-h-[44px] px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between ${
              highContrast
                ? 'bg-primary/10 border-primary text-primary shadow-tactile ring-1 ring-primary/20'
                : 'bg-canvas border-surface-border text-ink-muted hover:text-ink shadow-tactile-sm'
            }`}
          >
            <div className="flex items-center gap-2">
              <SunMedium className="w-4 h-4" />
              <span>戶外強光高對比模式</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-surface border border-surface-border">
              {highContrast ? '已開啟 (日照增強)' : '已關閉 (預設柔和)'}
            </span>
          </button>
        </div>
      </div>

      {/* CARD 2: Visual Theme Accent (Modern Tactile Card UI) */}
      <div className="bg-surface rounded-3xl border border-surface-border p-5 shadow-tactile space-y-3.5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-extrabold text-ink">主視覺強調色 (Modern Tactile Accent)</h3>
          </div>
          <span className="text-[10px] font-bold text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            高飽和 CTA
          </span>
        </div>

        <p className="text-[11px] text-ink-muted leading-relaxed font-medium">
          畫布採用柔和微灰 (#F6F6F8) 與純白浮雕卡片，主色專注於關鍵 CTA 與狀態標籤：
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Pine Green (User Selected Default) */}
          <button
            type="button"
            onClick={() => handleSelectAccent('pine')}
            className={`min-h-[44px] p-3 rounded-2xl border text-left transition-all ${
              activeAccent === 'pine'
                ? 'bg-surface border-[#15803D] shadow-tactile ring-2 ring-[#15803D]/20'
                : 'bg-canvas border-surface-border hover:bg-surface shadow-tactile-sm'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-[#15803D] shadow-sm mb-2" />
            <div className="text-xs font-bold text-ink">高山冷杉綠</div>
            <div className="text-[10px] text-ink-muted font-mono mt-0.5">#15803D (首選)</div>
          </button>

          {/* Amber */}
          <button
            type="button"
            onClick={() => handleSelectAccent('amber')}
            className={`min-h-[44px] p-3 rounded-2xl border text-left transition-all ${
              activeAccent === 'amber'
                ? 'bg-surface border-[#D97706] shadow-tactile ring-2 ring-[#D97706]/20'
                : 'bg-canvas border-surface-border hover:bg-surface shadow-tactile-sm'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-[#D97706] shadow-sm mb-2" />
            <div className="text-xs font-bold text-ink">薩凡納暖金</div>
            <div className="text-[10px] text-ink-muted font-mono mt-0.5">#D97706</div>
          </button>

          {/* Cobalt Blue */}
          <button
            type="button"
            onClick={() => handleSelectAccent('cobalt')}
            className={`min-h-[44px] p-3 rounded-2xl border text-left transition-all ${
              activeAccent === 'cobalt'
                ? 'bg-surface border-[#2563EB] shadow-tactile ring-2 ring-[#2563EB]/20'
                : 'bg-canvas border-surface-border hover:bg-surface shadow-tactile-sm'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-[#2563EB] shadow-sm mb-2" />
            <div className="text-xs font-bold text-ink">寰宇天際藍</div>
            <div className="text-[10px] text-ink-muted font-mono mt-0.5">#2563EB</div>
          </button>

          {/* Obsidian */}
          <button
            type="button"
            onClick={() => handleSelectAccent('obsidian')}
            className={`min-h-[44px] p-3 rounded-2xl border text-left transition-all ${
              activeAccent === 'obsidian'
                ? 'bg-surface border-[#18181B] shadow-tactile ring-2 ring-[#18181B]/20'
                : 'bg-canvas border-surface-border hover:bg-surface shadow-tactile-sm'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-[#18181B] shadow-sm mb-2" />
            <div className="text-xs font-bold text-ink">極簡曜石黑</div>
            <div className="text-[10px] text-ink-muted font-mono mt-0.5">#18181B</div>
          </button>
        </div>
      </div>

      {/* CARD 3: Currency Rates (Accessible / Local User Preference) */}
      <div className="bg-surface rounded-3xl border border-surface-border p-5 shadow-tactile space-y-3.5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-extrabold text-ink">預設外幣換匯參考匯率 (對新台幣 TWD)</h3>
          </div>
          {ratesSaved && <span className="text-[10px] text-primary font-bold">匯率已更新</span>}
        </div>

        <form onSubmit={handleSaveRates} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {['JPY', 'KRW', 'USD', 'EUR', 'THB'].map((curr) => (
              <div key={curr} className="p-2.5 rounded-2xl bg-canvas border border-surface-border">
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  1 {curr} = ? TWD
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={rates[curr] || DEFAULT_EXCHANGE_RATES[curr] || 1}
                  onChange={(e) =>
                    setRates({ ...rates, [curr]: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full min-h-[38px] px-2.5 py-1.5 rounded-xl bg-surface border border-surface-border font-mono text-xs text-ink focus:outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all shadow-tactile-sm"
            >
              儲存自訂換匯率
            </button>
          </div>
        </form>
      </div>

      {/* CARD 4: Trip Management (旅程列表與管理) */}
      {trips && trips.length > 0 && (
        <div className="bg-surface rounded-3xl border border-surface-border p-5 shadow-tactile space-y-3.5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-extrabold text-ink">旅程管理與切換 ({trips.length})</h3>
            </div>
            {onOpenNewTripModal && (
              <button
                type="button"
                onClick={onOpenNewTripModal}
                className="px-2.5 py-1 rounded-xl bg-primary text-white text-[11px] font-bold hover:bg-primary-dark transition-all flex items-center gap-1 shadow-tactile-sm"
              >
                <Plus className="w-3 h-3" />
                <span>新建旅程</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {trips.map((t) => {
              const isActive = t.id === trip?.id;
              return (
                <div
                  key={t.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-primary/10 border-primary/20 shadow-tactile-sm'
                      : 'bg-canvas border-surface-border'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-ink truncate">{t.title}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-lg bg-primary text-white text-[9px] font-bold">
                          使用中
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-ink-muted flex items-center gap-2 mt-1">
                      <span>{t.destination || '未設定地點'}</span>
                      <span>•</span>
                      <span>{t.startDate} ~ {t.endDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!isActive && onSelectTrip && (
                      <button
                        type="button"
                        onClick={() => onSelectTrip(t.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-surface border border-surface-border text-ink hover:text-primary text-[11px] font-bold transition-all shadow-tactile-sm"
                      >
                        切換
                      </button>
                    )}
                    {onEditTrip && (
                      <button
                        type="button"
                        onClick={() => onEditTrip(t)}
                        className="p-1.5 rounded-xl bg-surface border border-surface-border text-ink-muted hover:text-ink transition-colors shadow-tactile-sm"
                        title="編輯此旅程"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteTrip && (
                      <button
                        type="button"
                        onClick={() => onDeleteTrip(t)}
                        className="p-1.5 rounded-xl bg-surface border border-surface-border text-ink-muted hover:text-terracotta hover:bg-terracotta/10 transition-colors shadow-tactile-sm"
                        title="刪除此旅程"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CARD 5: Data Management & Full Backup */}
      <div className="bg-surface rounded-3xl border border-surface-border p-5 shadow-tactile space-y-3.5 overflow-hidden">
        <div className="border-b border-surface-border pb-2.5">
          <h3 className="text-xs font-extrabold text-ink">本機離線資料備份與還原</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={handleExportBackup}
            className="min-h-[44px] p-3 rounded-2xl bg-canvas border border-surface-border text-ink hover:bg-surface transition-all flex items-center justify-between text-xs font-semibold shadow-tactile-sm"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              <span>匯出完整旅程備份 (JSON)</span>
            </div>
          </button>

          <button
            onClick={handleResetSampleData}
            className="min-h-[44px] p-3 rounded-2xl bg-canvas border border-surface-border text-ink hover:bg-surface transition-all flex items-center justify-between text-xs font-semibold shadow-tactile-sm"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-terracotta" />
              <span>重置為官方示範資料</span>
            </div>
          </button>
        </div>
      </div>

      {/* CARD 6: PROTECTED ADMIN CONSOLE - GOOGLE SHEET AS CENTRAL SECRETS & RBAC HUB */}
      <div className="bg-surface rounded-3xl border border-surface-border p-5 shadow-tactile space-y-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-extrabold text-ink">Google 試算表雲端中控 (金鑰與權限託管)</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] px-2.5 py-1 rounded-full font-bold shadow-tactile-sm ${
                isAdminUnlocked
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-canvas text-ink-muted border border-surface-border'
              }`}
            >
              {isAdminUnlocked ? '試算表管理者已驗證' : '受密碼保護 (一般旅伴已隱藏)'}
            </span>
          </div>
        </div>

        {/* When Locked: General Companions see ZERO API keys or credentials */}
        {!isAdminUnlocked ? (
          <div className="p-4 rounded-2xl bg-canvas border border-surface-border space-y-3.5 text-xs">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-ink-muted flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[12px] font-bold text-ink">
                  集中由 Google 試算表託管金鑰與權限
                </p>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  系統技術金鑰（Firebase 即時同步、Gemini AI OCR 辨識）與成員權限（管理者密碼、Google 登入白名單）全部統一由 Google 試算表雲端讀取與確認，前端不保留明文，一般旅伴亦無法查看。
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface border border-surface-border text-[11px] flex items-center justify-between">
              <span className="text-ink-muted">目前綁定試算表中控：</span>
              <span className="font-mono text-ink font-semibold truncate max-w-[200px]">
                {gasUrl ? '已綁定 Google Apps Script' : '尚未綁定 (使用本機備用)'}
              </span>
            </div>

            <div className="pt-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] text-ink-light font-medium">
                <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                <span>以試算表 AdminPin 驗證解鎖</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-tactile-sm"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>解鎖管理者設定</span>
              </button>
            </div>
          </div>
        ) : (
          /* When Unlocked: Verified Secrets & RBAC Hub */
          <div className="space-y-4 pt-1">
            {/* Top Unlock Banner with Refresh & Lock Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Unlock className="w-4 h-4 flex-shrink-0" />
                <span>管理者已通過 Google 試算表密碼驗證</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshFromGas}
                  disabled={gasSyncLoading}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-tactile-sm disabled:opacity-50"
                  title="重新從 Google 試算表讀取最新金鑰與成員權限"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${gasSyncLoading ? 'animate-spin' : ''}`} />
                  <span>{gasSyncLoading ? '同步中...' : '從試算表重新整理確認'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLockAdmin}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-ink hover:text-terracotta text-xs font-bold transition-all shadow-tactile-sm"
                >
                  立即上鎖
                </button>
              </div>
            </div>

            {/* Sync Feedback Message */}
            {gasSyncStatus && (
              <div className="p-3 rounded-2xl bg-surface border border-surface-border text-xs text-ink flex items-start gap-2 shadow-tactile-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{gasSyncStatus}</span>
              </div>
            )}

            {/* SECTION 1: Google Sheet Central Hub Info */}
            <div className="p-4 rounded-2xl bg-canvas border border-surface-border space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-surface-border pb-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <span className="font-bold text-ink">Google 試算表中控端點 (GAS)</span>
                </div>
                <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  即時託管來源
                </span>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-ink-muted">Apps Script 網頁應用程式網址：</label>
                <input
                  type="url"
                  readOnly
                  value={gasUrl || '尚未綁定試算表'}
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-ink font-mono text-[11px] focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-ink-muted leading-relaxed">
                💡 金鑰與權限隨時可在 Google 試算表「權限與金鑰」及「成員名單」工作表修改，修改後點擊上方「從試算表重新整理確認」即可一鍵同步生效。
              </p>
            </div>

            {/* SECTION 2: Verified Secrets Dashboard (Read & Confirmed from Google Sheet) */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-ink px-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-primary" />
                <span>已由 Google 試算表確認之技術金鑰</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Firebase Realtime Sync */}
                <div className="p-3.5 rounded-2xl bg-canvas border border-surface-border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-ink">
                      <Cloud className="w-4 h-4 text-primary" />
                      <span>Firebase 即時同步資料庫</span>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        isFirebaseConnected
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-surface text-ink-muted border border-surface-border'
                      }`}
                    >
                      {isFirebaseConnected ? '已連線 (即時同步)' : '未連線 (Local-First)'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-ink-muted">
                      <span>API Key:</span>
                      <span className="text-ink font-bold">{apiKey ? maskKey(apiKey) : '試算表未提供'}</span>
                    </div>
                    <div className="flex items-center justify-between text-ink-muted">
                      <span>Project ID:</span>
                      <span className="text-ink">{projectId || '未提供'}</span>
                    </div>
                    <div className="flex items-center justify-between text-ink-muted">
                      <span>App ID:</span>
                      <span className="text-ink truncate max-w-[140px]">{appId ? maskKey(appId) : '未提供'}</span>
                    </div>
                  </div>
                </div>

                {/* Gemini Vision OCR */}
                <div className="p-3.5 rounded-2xl bg-canvas border border-surface-border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-ink">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Gemini Vision OCR 辨識</span>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        geminiKeyInput
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-surface text-ink-muted border border-surface-border'
                      }`}
                    >
                      {geminiKeyInput ? '已啟用 (相機拍照記帳)' : '未設定'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-ink-muted">
                      <span>API Key:</span>
                      <span className="text-ink font-bold">
                        {geminiKeyInput ? maskKey(geminiKeyInput) : '試算表未提供'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-ink-muted">
                      <span>OCR 支援:</span>
                      <span className="text-ink">多國語言收據自動剖析</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Member RBAC & Whitelist from Google Sheet */}
            <div className="p-4 rounded-2xl bg-canvas border border-surface-border space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-surface-border pb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="font-bold text-ink">權限管理：成員角色與 Google 登入白名單</span>
                </div>
                <span className="text-[10px] text-ink-muted">
                  來源：試算表「成員名單」
                </span>
              </div>

              <p className="text-[11px] text-ink-muted leading-relaxed">
                只有在 Google 試算表「成員名單」中登記的成員及其 Google 帳號 (Email)，才能通過登入驗證並存取此旅程資料。
              </p>

              <div className="space-y-2">
                {trip?.members && trip.members.length > 0 ? (
                  trip.members.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl bg-surface border border-surface-border flex items-center justify-between gap-2 shadow-tactile-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: m.avatarColor || '#15803D' }}
                        >
                          {m.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-ink text-xs truncate">{m.name}</span>
                            {m.isDefaultPayer && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                                預設代墊
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-ink-muted font-mono truncate">
                            {m.email || '未填寫 Google 帳號 (僅姓名比對)'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            m.role === 'Admin'
                              ? 'bg-primary text-white'
                              : 'bg-canvas text-ink-muted border border-surface-border'
                          }`}
                        >
                          {m.role === 'Admin' ? '管理者 (Admin)' : '旅伴 (Member)'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-ink-muted text-xs">
                    目前暫無成員資料，請點擊上方重新整理以載入試算表名單
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 4: Collapsed Manual Override for Offline / Dev Fallback */}
            <details className="p-3.5 rounded-2xl bg-canvas border border-surface-border text-xs group">
              <summary className="font-semibold text-ink-muted hover:text-ink cursor-pointer flex items-center justify-between list-none">
                <div className="flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-ink-muted" />
                  <span>進階離線備用：手動覆寫 Firebase / Gemini 金鑰</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
              </summary>

              <div className="pt-3 space-y-4 border-t border-surface-border mt-3">
                {/* Manual Firebase form */}
                <form onSubmit={handleSaveFirebaseConfig} className="space-y-2">
                  <span className="font-bold text-ink block">手動設定 Firebase</span>
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-0.5">Firebase API Key</label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full min-h-[36px] px-3 py-1 rounded-xl bg-surface border border-surface-border text-ink font-mono text-[11px] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-ink-muted mb-0.5">Project ID</label>
                      <input
                        type="text"
                        placeholder="giratrip-demo"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="w-full min-h-[36px] px-3 py-1 rounded-xl bg-surface border border-surface-border text-ink font-mono text-[11px] focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-muted mb-0.5">App ID</label>
                      <input
                        type="text"
                        placeholder="1:123456:web:abcd"
                        value={appId}
                        onChange={(e) => setAppId(e.target.value)}
                        className="w-full min-h-[36px] px-3 py-1 rounded-xl bg-surface border border-surface-border text-ink font-mono text-[11px] focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  {firebaseStatusMsg && (
                    <div className="p-2 rounded-xl bg-surface border border-surface-border text-[10px] text-ink font-medium">
                      {firebaseStatusMsg}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-bold hover:bg-primary-dark transition-all shadow-tactile-sm"
                    >
                      手動儲存 Firebase
                    </button>
                  </div>
                </form>

                {/* Manual Gemini Form */}
                <form onSubmit={handleSaveGeminiKey} className="space-y-2 pt-2 border-t border-surface-border">
                  <span className="font-bold text-ink block">手動設定 Gemini API Key</span>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="AIzaSy... (Gemini API Key)"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      className="flex-1 min-h-[36px] px-3 py-1 rounded-xl bg-surface border border-surface-border text-[11px] text-ink font-mono focus:outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-bold hover:bg-primary-dark transition-all shadow-tactile-sm"
                    >
                      {geminiSaved ? '已儲存' : '手動儲存'}
                    </button>
                  </div>
                </form>
              </div>
            </details>
          </div>
        )}
      </div>

      {/* MODAL: Master Admin PIN Verification & GAS Connection */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-surface border border-surface-border shadow-2xl p-5 space-y-4 text-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-ink">Google 試算表管理者驗證</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setPinError(null);
                  setAdminPinInput('');
                }}
                className="text-ink-muted hover:text-ink p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-ink-muted leading-relaxed">
              系統將直接連線至 Google 試算表驗證管理者通行密碼 (AdminPin)。驗證通過後，將自動載入 Firebase 金鑰、Gemini OCR 辨識金鑰與成員權限名單！
            </p>

            {pinError && (
              <div className="p-3 rounded-2xl bg-terracotta/10 border border-terracotta/30 text-terracotta flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-tight text-[11px] font-medium">{pinError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockAdmin} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-ink mb-1 text-[11px]">
                  Google Apps Script 網頁應用程式網址 (GAS URL)
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={gasUrl}
                  onChange={(e) => setGasUrl(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-canvas border border-surface-border text-ink font-mono text-[11px] focus:outline-none focus:border-primary shadow-tactile-sm"
                />
                <span className="text-[10px] text-ink-muted block mt-1">
                  若已有綁定旅程試算表將自動帶入；若留空則以本機預設通行碼 (giratrip888) 解鎖。
                </span>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1 text-[11px]">
                  試算表管理者通行密碼 (AdminPin)
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="請輸入試算表「權限與金鑰」中的 AdminPin..."
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setPinError(null);
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl bg-canvas border border-surface-border text-ink placeholder:text-ink-light font-mono text-sm focus:outline-none focus:border-primary shadow-tactile-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinError(null);
                    setAdminPinInput('');
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-2xl font-medium text-ink-muted hover:text-ink"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={gasSyncLoading}
                  className="min-h-[44px] px-5 py-2 rounded-2xl font-bold bg-primary text-white hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-tactile-sm disabled:opacity-50"
                >
                  {gasSyncLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>正在向試算表驗證...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>驗證並讀取試算表設定</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

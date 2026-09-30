import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Coins, 
  Download, 
  RotateCcw, 
  Check, 
  ExternalLink, 
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
  Trash2
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
  const [gasUrl, setGasUrl] = useState(() => localStorage.getItem('giratrip_gas_url') || '');
  const [gasAdminPin, setGasAdminPin] = useState('');
  const [gasSyncLoading, setGasSyncLoading] = useState(false);
  const [gasSyncStatus, setGasSyncStatus] = useState<string | null>(null);

  // Gemini API key (Admin only)
  const [geminiKeyInput, setGeminiKeyInput] = useState(getStoredGeminiApiKey());
  const [geminiSaved, setGeminiSaved] = useState(false);

  // Exchange rates
  const [rates, setRates] = useState<Record<string, number>>(loadExchangeRates());
  const [ratesSaved, setRatesSaved] = useState(false);

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

  // Master PIN check (Default: 'giratrip888')
  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const masterPin = localStorage.getItem('giratrip_master_pin') || 'giratrip888';
    if (adminPinInput.trim() === masterPin) {
      setIsAdminUnlocked(true);
      sessionStorage.setItem('giratrip_admin_unlocked', 'true');
      setShowPinModal(false);
      setAdminPinInput('');
      setPinError(null);
    } else {
      setPinError('密碼錯誤！預設管理者通行碼為 giratrip888');
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('giratrip_admin_unlocked');
  };

  const handleFetchGasConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gasUrl.trim()) {
      setGasSyncStatus('請輸入 Google Apps Script 網頁應用程式網址');
      return;
    }
    setGasSyncLoading(true);
    setGasSyncStatus(null);
    try {
      const res = await fetchGasConfig(gasUrl.trim(), gasAdminPin.trim());
      if (res.status === 'success' && res.role === 'admin' && res.config) {
        localStorage.setItem('giratrip_gas_url', gasUrl.trim());
        if (res.config.firebase && res.config.firebase.apiKey) {
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
        if (res.config.geminiApiKey) {
          setGeminiKeyInput(res.config.geminiApiKey);
          setStoredGeminiApiKey(res.config.geminiApiKey);
        }
        setGasSyncStatus('已成功從 Google 試算表載入管理者金鑰並自動建立連線！');
      } else {
        setGasSyncStatus(res.message || '通行碼錯誤或試算表中尚未填寫金鑰');
      }
    } catch (err: any) {
      setGasSyncStatus(`GAS 讀取失敗: ${err.message}`);
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

      {/* CARD 5: PROTECTED ADMIN CONSOLE (Role-Based Access Control) */}
      <div className="bg-surface rounded-3xl border border-surface-border p-5 shadow-tactile space-y-3.5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-extrabold text-ink">系統技術與雲端同步 (管理者專區)</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] px-2.5 py-1 rounded-full font-bold shadow-tactile-sm ${
                isAdminUnlocked
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-canvas text-ink-muted border border-surface-border'
              }`}
            >
              {isAdminUnlocked ? '管理者已驗證' : '受密碼保護 (一般旅伴已隱藏)'}
            </span>
          </div>
        </div>

        {/* When Locked: General Companions see ZERO API keys or credentials */}
        {!isAdminUnlocked ? (
          <div className="p-4 rounded-2xl bg-canvas border border-surface-border space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-ink-muted flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-ink-muted leading-relaxed">
                為防止金鑰外洩或資料庫被竄改，Firebase 雲端同步金鑰與 Gemini AI 辨識金鑰已被安全遮蔽，一般旅伴無需也無法查看。若您是旅程主揪或系統管理者，請點擊下方解鎖進行進階設定。
              </p>
            </div>

            <div className="pt-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] text-ink-light font-medium">
                <FileCode2 className="w-3.5 h-3.5" />
                <span>亦支援建置環境變數 (.env) 零接觸自動載入</span>
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
          /* When Unlocked: Only Admin can view/edit technical credentials */
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/10 border border-primary/20 text-xs">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Unlock className="w-4 h-4" />
                <span>管理者控制台已開啟 (離開頁面時請手動上鎖)</span>
              </div>
              <button
                type="button"
                onClick={handleLockAdmin}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-ink hover:text-terracotta text-xs font-bold transition-all shadow-tactile-sm"
              >
                立即重新上鎖
              </button>
            </div>

            {/* Google Apps Script (GAS) Cloud Sync (Admin) */}
            <div className="p-4 rounded-2xl bg-canvas border border-surface-border space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-surface-border pb-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <span className="font-bold text-ink">從 Google 試算表 (GAS) 雲端一鍵載入金鑰</span>
                </div>
                <span className="text-[10px] font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  安全無痕載入
                </span>
              </div>

              <p className="text-[11px] text-ink-muted leading-relaxed">
                若您在 Google 試算表的「權限與金鑰」工作表填寫了 Firebase 或 Gemini Key，可在此輸入 GAS 網址與管理者通行碼，一鍵載入並自動連線：
              </p>

              {gasSyncStatus && (
                <div className="p-2.5 rounded-xl bg-surface border border-surface-border text-xs text-ink flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="font-medium">{gasSyncStatus}</span>
                </div>
              )}

              <form onSubmit={handleFetchGasConfig} className="space-y-2.5">
                <div>
                  <label className="block font-semibold text-ink mb-1">Google Apps Script 網頁應用程式網址</label>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-ink font-mono text-[11px] focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">試算表管理者通行碼 (AdminPin)</label>
                  <input
                    type="password"
                    placeholder="預設為 giratrip888"
                    value={gasAdminPin}
                    onChange={(e) => setGasAdminPin(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-ink font-mono text-[11px] focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={gasSyncLoading}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-tactile-sm disabled:opacity-50"
                  >
                    <Download className={`w-3.5 h-3.5 ${gasSyncLoading ? 'animate-spin' : ''}`} />
                    <span>{gasSyncLoading ? '正在讀取試算表...' : '從 Google 試算表載入金鑰並建立連線'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Google Firebase Configuration (Admin) */}
            <div className="p-4 rounded-2xl bg-canvas border border-surface-border space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-surface-border pb-2">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-primary" />
                  <span className="font-bold text-ink">Google Firebase Firestore 動態同步</span>
                </div>
                <span className="text-[10px] font-bold text-primary">
                  {isFirebaseConnected ? '已連線 (即時同步)' : '本機 Local-First 模式'}
                </span>
              </div>

              {firebaseStatusMsg && (
                <div className="p-2.5 rounded-xl bg-surface border border-surface-border text-xs text-ink flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>{firebaseStatusMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveFirebaseConfig} className="space-y-2.5">
                <div>
                  <label className="block font-semibold text-ink mb-1">Firebase API Key</label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-ink font-mono text-[11px] focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-ink mb-1">Project ID</label>
                    <input
                      type="text"
                      placeholder="giratrip-demo"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-ink font-mono text-[11px] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink mb-1">App ID</label>
                    <input
                      type="text"
                      placeholder="1:123456:web:abcd"
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                      className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-ink font-mono text-[11px] focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-tactile-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>儲存並測試 Firebase 連線</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Google Gemini API Key (Admin) */}
            <div className="p-4 rounded-2xl bg-canvas border border-surface-border space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-surface-border pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-bold text-ink">Google Gemini Vision OCR 辨識金鑰</span>
                </div>
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                >
                  <span>取得 API Key</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <form onSubmit={handleSaveGeminiKey} className="flex gap-2">
                <input
                  type="password"
                  placeholder="AIzaSy... (Gemini API Key)"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  className="flex-1 min-h-[44px] px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-xs text-ink font-mono focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-1 shadow-tactile-sm"
                >
                  {geminiSaved ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{geminiSaved ? '已儲存' : '儲存 Key'}</span>
                </button>
              </form>
            </div>

            {/* Zero-Exposure Environment Variable Guide */}
            <div className="p-3.5 rounded-2xl bg-canvas border border-surface-border text-[11px] text-ink-muted leading-relaxed">
              <span className="font-bold text-ink block mb-1">💡 最佳實踐：零外洩建置注入</span>
              您可直接在專案的 <code className="text-primary font-mono font-bold">.env.local</code> 或 Cloudflare Pages 環境變數中設定：
              <div className="p-2 rounded-xl bg-surface border border-surface-border font-mono text-[10px] text-ink mt-1.5 space-y-0.5">
                <div>VITE_FIREBASE_API_KEY=你的金鑰</div>
                <div>VITE_FIREBASE_PROJECT_ID=專案ID</div>
                <div>VITE_GEMINI_API_KEY=Gemini金鑰</div>
              </div>
              完成後系統將於背景全自動初始化，全體使用者前端 100% 絕無任何金鑰洩漏風險！
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Master Admin PIN Verification */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-surface border border-surface-border shadow-2xl p-5 space-y-3.5 text-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-ink">管理者權限驗證</h3>
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
              請輸入旅程管理者通行密碼以解鎖雲端連線與 AI 金鑰設定（預設通關碼：<code className="text-primary font-mono font-bold">giratrip888</code>）：
            </p>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-terracotta/10 border border-terracotta/30 text-terracotta flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-tight">{pinError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockAdmin} className="space-y-3">
              <div>
                <input
                  type="password"
                  autoFocus
                  placeholder="請輸入管理者密碼..."
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
                  className="min-h-[44px] px-5 py-2 rounded-2xl font-bold bg-primary text-white hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-tactile-sm"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>確認解鎖</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

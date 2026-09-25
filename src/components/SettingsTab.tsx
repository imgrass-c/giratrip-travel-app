import React, { useState } from 'react';
import { 
  Cloud, 
  Coins, 
  Download, 
  RotateCcw, 
  Check, 
  ExternalLink, 
  Sparkles 
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
  onUpdateTrip?: (updatedTrip: Trip) => void;
  onReloadAllData: () => void;
  isFirebaseConnected: boolean;
  setIsFirebaseConnected: (val: boolean) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  onReloadAllData,
  isFirebaseConnected,
  setIsFirebaseConnected,
}) => {
  // Firebase configuration form
  const storedConfig = getStoredFirebaseConfig();
  const [apiKey, setApiKey] = useState(storedConfig?.apiKey || '');
  const [projectId, setProjectId] = useState(storedConfig?.projectId || '');
  const [appId, setAppId] = useState(storedConfig?.appId || '');
  const [firebaseStatusMsg, setFirebaseStatusMsg] = useState<string | null>(null);

  // Gemini API key
  const [geminiKeyInput, setGeminiKeyInput] = useState(getStoredGeminiApiKey());
  const [geminiSaved, setGeminiSaved] = useState(false);

  // Exchange rates
  const [rates, setRates] = useState<Record<string, number>>(loadExchangeRates());
  const [ratesSaved, setRatesSaved] = useState(false);

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
    <div className="space-y-4 pb-20">
      {/* Google Firebase Configuration */}
      <div className="bg-surface rounded-2xl border border-surface-border p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-ink">Google Firebase Firestore 動態同步設定</h3>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              isFirebaseConnected
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-canvas text-ink-muted border border-surface-border'
            }`}
          >
            {isFirebaseConnected ? '已連線 Firestore (即時同步)' : '本機 Local-First 離線模式'}
          </span>
        </div>

        <p className="text-[11px] text-ink-muted leading-relaxed">
          填入 Firebase 專案設定後，當旅伴或您於手機開啟 Web App，記帳與金流資料會立即與雲端資料庫秒級同步更新。
        </p>

        {firebaseStatusMsg && (
          <div className="p-2.5 rounded-xl bg-canvas border border-surface-border text-xs text-ink flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span>{firebaseStatusMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveFirebaseConfig} className="space-y-2.5 text-xs">
          <div>
            <label className="block font-semibold text-ink mb-1">Firebase API Key</label>
            <input
              type="text"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-canvas border border-surface-border text-ink font-mono text-[11px] focus:outline-none focus:border-primary"
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
                className="w-full px-3 py-1.5 rounded-xl bg-canvas border border-surface-border text-ink font-mono text-[11px] focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink mb-1">App ID</label>
              <input
                type="text"
                placeholder="1:123456:web:abcd"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-canvas border border-surface-border text-ink font-mono text-[11px] focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors flex items-center gap-1 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>儲存並測試連線</span>
            </button>
          </div>
        </form>
      </div>

      {/* Google Gemini Vision API Key (For OCR & Menu Translation) */}
      <div className="bg-surface rounded-2xl border border-surface-border p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-ink">Google Gemini Vision 多模態 OCR 翻譯金鑰</h3>
          </div>
          <a
            href="https://aistudio.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
          >
            <span>免費取得 API Key</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        <p className="text-[11px] text-ink-muted leading-relaxed">
          提供 Gemini API Key 後，可啟動 SOTA 級別的日韓英文紙本收據 OCR 辨識與餐廳菜單繁體中文逐行翻譯。未填寫時，系統自動啟用內建本機智慧解析引擎。
        </p>

        <form onSubmit={handleSaveGeminiKey} className="flex gap-2">
          <input
            type="password"
            placeholder="AIzaSy... (Gemini API Key)"
            value={geminiKeyInput}
            onChange={(e) => setGeminiKeyInput(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-xl bg-canvas border border-surface-border text-xs text-ink font-mono focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors flex items-center gap-1 shadow-sm"
          >
            {geminiSaved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{geminiSaved ? '已儲存' : '儲存 Key'}</span>
          </button>
        </form>
      </div>

      {/* Custom Currency Exchange Rates Editor */}
      <div className="bg-surface rounded-2xl border border-surface-border p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-ink">自訂預設換匯匯率 (對新台幣 TWD)</h3>
          </div>
          {ratesSaved && <span className="text-[10px] text-primary font-medium">匯率已更新</span>}
        </div>

        <form onSubmit={handleSaveRates} className="space-y-2.5 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {['JPY', 'KRW', 'USD', 'EUR', 'THB'].map((curr) => (
              <div key={curr} className="p-2 rounded-xl bg-canvas border border-surface-border">
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
                  className="w-full px-2 py-1 rounded-lg bg-surface border border-surface-border font-mono text-xs text-ink focus:outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors shadow-sm"
            >
              儲存自訂匯率
            </button>
          </div>
        </form>
      </div>

      {/* Data Management & Backup */}
      <div className="bg-surface rounded-2xl border border-surface-border p-4 shadow-sm space-y-3">
        <div className="border-b border-surface-border pb-2.5">
          <h3 className="text-xs font-bold text-ink">資料管理與完整備份</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={handleExportBackup}
            className="p-3 rounded-xl bg-canvas border border-surface-border text-ink hover:bg-surface-hover transition-colors flex items-center justify-between text-xs font-medium"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              <span>匯出完整旅程備份 (JSON)</span>
            </div>
          </button>

          <button
            onClick={handleResetSampleData}
            className="p-3 rounded-xl bg-canvas border border-surface-border text-ink hover:bg-surface-hover transition-colors flex items-center justify-between text-xs font-medium"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-terracotta" />
              <span>重置為官方範例旅程</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

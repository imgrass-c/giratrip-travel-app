import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Utensils, 
  Receipt, 
  Sparkles, 
  Check, 
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react';
import type { Trip, OCRScanResult, Expense } from '../types';
import { processOCRImage, getStoredGeminiApiKey } from '../services/ocr';
import { loadExchangeRates } from '../services/storage';

interface ScannerTabProps {
  trip: Trip;
  onImportExpenseFromOCR: (expense: Expense) => void;
}

export const ScannerTab: React.FC<ScannerTabProps> = ({
  trip,
  onImportExpenseFromOCR,
}) => {
  const [scanMode, setScanMode] = useState<'receipt' | 'menu'>('receipt');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<OCRScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const customRates = loadExchangeRates();
  const geminiKey = getStoredGeminiApiKey();

  // Trigger file selection
  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreviewImage(base64);
      runOCR(base64, scanMode);
    };
    reader.readAsDataURL(file);
  };

  // Run OCR
  const runOCR = async (base64: string, mode: 'receipt' | 'menu') => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await processOCRImage(base64, mode, 'JPY');
      setScanResult(result);
    } catch (err: any) {
      setErrorMessage(err?.message || '辨識失敗，請重試');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Demo samples
  const handleLoadSample = (mode: 'receipt' | 'menu') => {
    setScanMode(mode);
    setPreviewImage(null);
    runOCR('', mode);
  };

  const handleToggleItemSelection = (id: string) => {
    if (!scanResult) return;
    setScanResult({
      ...scanResult,
      detectedItems: scanResult.detectedItems.map((it) =>
        it.id === id ? { ...it, selected: !it.selected } : it
      ),
    });
  };

  // Import selected items into Trip Expenses
  const handleImportToExpenses = () => {
    if (!scanResult) return;
    const selected = scanResult.detectedItems.filter((it) => it.selected);
    if (selected.length === 0) {
      setErrorMessage('請至少勾選一個品項');
      return;
    }

    const curr = scanResult.currency || 'JPY';
    const rate = curr === trip.baseCurrency ? 1.0 : (customRates[curr] || 0.215);

    if (scanMode === 'receipt') {
      // Import as a single combined receipt expense
      const totalOriginal = selected.reduce((sum, it) => sum + (it.price || 0), 0);
      const totalBase = Math.round(totalOriginal * rate);

      const expense: Expense = {
        id: `exp_ocr_${Date.now()}`,
        tripId: trip.id,
        title: `${scanResult.merchantName || '收據開銷'} (${selected.length}品項)`,
        category: 'dining',
        date: scanResult.date || new Date().toISOString().split('T')[0],
        originalCurrency: curr,
        originalAmount: totalOriginal,
        exchangeRate: rate,
        amountInBaseCurrency: totalBase,
        paidById: trip.members[0]?.id || '',
        splitType: 'equal',
        splitMemberIds: trip.members.map((m) => m.id),
        receiptImageUrl: previewImage || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onImportExpenseFromOCR(expense);
      setSuccessMessage(`成功將 ${scanResult.merchantName} 收據 (${totalBase.toLocaleString()} ${trip.baseCurrency}) 匯入記帳！`);
    } else {
      // Menu mode: import selected dishes
      const totalOriginal = selected.reduce((sum, it) => sum + (it.price || 0), 0);
      const totalBase = Math.round(totalOriginal * rate);
      const dishTitles = selected.map((it) => it.translatedName || it.name).join('、');

      const expense: Expense = {
        id: `exp_menu_${Date.now()}`,
        tripId: trip.id,
        title: `${scanResult.merchantName || '餐廳點餐'}: ${dishTitles}`,
        category: 'dining',
        date: new Date().toISOString().split('T')[0],
        originalCurrency: curr,
        originalAmount: totalOriginal,
        exchangeRate: rate,
        amountInBaseCurrency: totalBase,
        paidById: trip.members[0]?.id || '',
        splitType: 'equal',
        splitMemberIds: trip.members.map((m) => m.id),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onImportExpenseFromOCR(expense);
      setSuccessMessage(`成功將勾選之菜單餐點 (${totalBase.toLocaleString()} ${trip.baseCurrency}) 匯入記帳！`);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Mode Switcher */}
      <div className="bg-surface rounded-2xl border border-surface-border p-2 shadow-sm flex items-center gap-1.5">
        <button
          onClick={() => {
            setScanMode('receipt');
            if (scanResult && scanResult.mode !== 'receipt') setScanResult(null);
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            scanMode === 'receipt'
              ? 'bg-primary text-white shadow-sm'
              : 'text-ink-muted hover:text-ink hover:bg-canvas'
          }`}
        >
          <Receipt className="w-4 h-4 stroke-[2]" />
          <span>外幣收據辨識記帳</span>
        </button>

        <button
          onClick={() => {
            setScanMode('menu');
            if (scanResult && scanResult.mode !== 'menu') setScanResult(null);
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            scanMode === 'menu'
              ? 'bg-primary text-white shadow-sm'
              : 'text-ink-muted hover:text-ink hover:bg-canvas'
          }`}
        >
          <Utensils className="w-4 h-4 stroke-[2]" />
          <span>日韓英文菜單翻譯</span>
        </button>
      </div>

      {/* AI Key notice or status */}
      <div className="bg-canvas rounded-xl p-2.5 border border-surface-border/80 flex items-center justify-between text-[11px] text-ink-muted">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>
            {geminiKey
              ? '已啟用 Google Gemini 1.5 Flash 多模態即時辨識與翻譯'
              : '本機離線智慧引擎已就緒（亦可在設定頁配置 Gemini API Key）'}
          </span>
        </div>
      </div>

      {/* Upload & Camera Box */}
      <div className="bg-surface rounded-2xl border-2 border-dashed border-surface-border p-6 text-center space-y-3.5 hover:border-primary/50 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleSelectFile}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-2xl bg-canvas border border-surface-border text-primary flex items-center justify-center mx-auto">
          {scanMode === 'receipt' ? (
            <Receipt className="w-6 h-6 stroke-[1.5]" />
          ) : (
            <Utensils className="w-6 h-6 stroke-[1.5]" />
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold text-ink">
            {scanMode === 'receipt' ? '拍照或上傳外幣收據明細' : '拍照或上傳外文餐廳菜單'}
          </h3>
          <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
            {scanMode === 'receipt'
              ? '自動解析店家名、消費日期、日文/韓文品名翻譯與金額，一鍵匯入分帳'
              : '逐行翻譯外文料理為繁體中文菜名，支援挑選菜色直接計算預算與記帳'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            <span>開啟相機拍照</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-xl bg-canvas border border-surface-border text-ink text-xs font-medium hover:bg-surface-hover transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4 text-ink-muted" />
            <span>從相簿選擇照片</span>
          </button>
        </div>

        {/* Quick Demo Sample Buttons */}
        <div className="pt-2 border-t border-surface-border/60 flex items-center justify-center gap-2">
          <span className="text-[10px] text-ink-muted">免拍照快速體驗：</span>
          {scanMode === 'receipt' ? (
            <button
              onClick={() => handleLoadSample('receipt')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-canvas text-primary hover:bg-primary/10 border border-primary/20 transition-colors font-medium"
            >
              載入淺草和牛壽喜燒收據範例
            </button>
          ) : (
            <button
              onClick={() => handleLoadSample('menu')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-canvas text-primary hover:bg-primary/10 border border-primary/20 transition-colors font-medium"
            >
              載入職人炭烤鰻魚料理菜單範例
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isProcessing && (
        <div className="bg-surface rounded-2xl border border-surface-border p-6 text-center space-y-2.5 animate-pulse">
          <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto" />
          <h4 className="text-xs font-bold text-ink">
            長頸鹿正在辨識與翻譯中...
          </h4>
          <p className="text-[11px] text-ink-muted">
            正在萃取文字、解析金額並轉換為繁體中文
          </p>
        </div>
      )}

      {/* Success alert */}
      {successMessage && (
        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30 text-primary text-xs flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="p-3 rounded-2xl bg-terracotta/10 border border-terracotta/30 text-terracotta text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Scan Results Card */}
      {scanResult && !isProcessing && (
        <div className="bg-surface rounded-2xl border border-surface-border p-4 shadow-sm space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-ink">{scanResult.merchantName}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                  {scanResult.mode === 'receipt' ? '收據辨識完成' : '菜單翻譯完成'}
                </span>
              </div>
              {scanResult.date && (
                <div className="text-[10px] text-ink-muted mt-0.5">
                  消費日期：{scanResult.date} • 幣別：{scanResult.currency}
                </div>
              )}
            </div>

            <button
              onClick={handleImportToExpenses}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>匯入旅程記帳</span>
            </button>
          </div>

          {/* Items Table */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-ink-muted flex items-center justify-between px-1">
              <span>勾選欲加入分帳的項目 ({scanResult.detectedItems.filter((i) => i.selected).length}/{scanResult.detectedItems.length})</span>
              <span>原幣金額 (換算新台幣)</span>
            </div>

            <div className="space-y-1.5">
              {scanResult.detectedItems.map((item) => {
                const rate = customRates[scanResult.currency || 'JPY'] || 0.215;
                const converted = item.price ? Math.round(item.price * rate) : 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleItemSelection(item.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      item.selected
                        ? 'bg-canvas border-primary/40 text-ink shadow-xs'
                        : 'bg-canvas/40 border-surface-border text-ink-muted opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => {}} // handled by div
                        className="rounded border-surface-border text-primary focus:ring-primary w-4 h-4 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-ink truncate">
                          {item.translatedName || item.name}
                        </div>
                        {item.translatedName && item.translatedName !== item.name && (
                          <div className="text-[10px] text-ink-muted font-mono truncate">
                            原文：{item.name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-ink">
                        {item.price?.toLocaleString()} {scanResult.currency}
                      </div>
                      <div className="text-[10px] text-ink-muted">
                        約 {converted.toLocaleString()} {trip.baseCurrency}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total of selected items */}
          <div className="p-3 rounded-xl bg-canvas border border-surface-border flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">已勾選項目總計</span>
            <div className="text-right">
              <span className="text-sm font-bold text-ink">
                {scanResult.detectedItems
                  .filter((i) => i.selected)
                  .reduce((sum, it) => sum + (it.price || 0), 0)
                  .toLocaleString()}{' '}
                {scanResult.currency}
              </span>
              <span className="text-xs text-ink-muted ml-1.5 font-medium">
                (約{' '}
                {Math.round(
                  scanResult.detectedItems
                    .filter((i) => i.selected)
                    .reduce((sum, it) => sum + (it.price || 0), 0) *
                    (customRates[scanResult.currency || 'JPY'] || 0.215)
                ).toLocaleString()}{' '}
                {trip.baseCurrency})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

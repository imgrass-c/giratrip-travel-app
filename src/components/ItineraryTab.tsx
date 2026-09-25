import React, { useState } from 'react';
import { 
  Plus, 
  MapPin, 
  Clock, 
  ExternalLink, 
  FileText, 
  Trash2, 
  Receipt, 
  RefreshCw, 
  Utensils, 
  Bus, 
  Building2, 
  Compass, 
  FileEdit,
  Video,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import type { Trip, ItineraryItem, ItineraryCategory } from '../types';
import { fetchGoogleSheetItinerary } from '../services/sheets';

interface ItineraryTabProps {
  trip: Trip;
  items: ItineraryItem[];
  onSaveItems: (items: ItineraryItem[]) => void;
  onLinkToExpense: (item: ItineraryItem) => void;
}

const CATEGORY_MAP: Record<ItineraryCategory, { label: string; icon: React.FC<{ className?: string }> }> = {
  attraction: { label: '景點', icon: Compass },
  food: { label: '美食', icon: Utensils },
  transport: { label: '交通', icon: Bus },
  hotel: { label: '住宿', icon: Building2 },
  note: { label: '備忘', icon: FileEdit },
};

export const ItineraryTab: React.FC<ItineraryTabProps> = ({
  trip,
  items,
  onSaveItems,
  onLinkToExpense,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState(trip.sheetCsvUrl || '');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Form states for new item
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [time, setTime] = useState('10:00');
  const [category, setCategory] = useState<ItineraryCategory>('attraction');
  const [notes, setNotes] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');

  // Calculate total days from items or default 3
  const maxDayInItems = items.reduce((max, it) => Math.max(max, it.dayNumber), 1);
  const totalDays = Math.max(maxDayInItems, 3);
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Filter items for selected day, sorted by time
  const currentDayItems = items
    .filter((it) => it.dayNumber === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newItem: ItineraryItem = {
      id: `it_${Date.now()}`,
      tripId: trip.id,
      dayNumber: selectedDay,
      time: time.trim() || '10:00',
      title: title.trim(),
      locationName: locationName.trim() || title.trim(),
      category,
      notes: notes.trim() || undefined,
      googleMapsUrl: googleMapsUrl.trim() || undefined,
      instagramUrl: instagramUrl.trim() || undefined,
      pdfUrl: pdfUrl.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onSaveItems([...items, newItem]);
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleDeleteItem = (id: string) => {
    onSaveItems(items.filter((it) => it.id !== id));
  };

  const resetForm = () => {
    setTitle('');
    setLocationName('');
    setTime('10:00');
    setCategory('attraction');
    setNotes('');
    setGoogleMapsUrl('');
    setInstagramUrl('');
    setPdfUrl('');
  };

  const handleSyncFromSheets = async () => {
    if (!sheetUrlInput.trim()) {
      setSyncError('請輸入有效的 Google Sheets CSV 發布網址');
      return;
    }
    setSyncLoading(true);
    setSyncError(null);
    try {
      const fetchedItems = await fetchGoogleSheetItinerary(sheetUrlInput, trip.id);
      if (fetchedItems.length === 0) {
        setSyncError('未在試算表中讀取到任何有效行程資料，請確認欄位格式');
      } else {
        // Merge with existing or overwrite
        onSaveItems(fetchedItems);
        setIsSyncModalOpen(false);
      }
    } catch (err: any) {
      setSyncError(err?.message || '同步失敗，請檢查試算表是否已公開發布為 CSV');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Action Header & Day Selector */}
      <div className="bg-surface rounded-2xl border border-surface-border p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-ink">行程天數</span>
            <span className="text-[10px] text-ink-muted">點選切換每日時間軸</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sync from Google Sheet button */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-canvas border border-surface-border text-[11px] font-medium text-ink hover:border-primary transition-colors flex items-center gap-1"
              title="從 Google Sheets 試算表同步行程"
            >
              <RefreshCw className="w-3 h-3 text-primary" />
              <span>同步試算表</span>
            </button>

            {/* Add Spot button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-primary text-white text-[11px] font-medium hover:bg-primary-dark transition-colors flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3 h-3" />
              <span>新增節點</span>
            </button>
          </div>
        </div>

        {/* Days Tabs (Scrollable on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {daysArray.map((day) => {
            const isSelected = selectedDay === day;
            const count = items.filter((it) => it.dayNumber === day).length;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-canvas text-ink hover:bg-surface-hover border border-surface-border/80'
                }`}
              >
                <span>第 {day} 天</span>
                <span className={`ml-1.5 text-[10px] ${isSelected ? 'text-white/80' : 'text-ink-muted'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setSelectedDay(totalDays + 1)}
            className="flex-shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-canvas border border-dashed border-surface-border text-ink-muted hover:text-ink hover:border-primary transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>加天數</span>
          </button>
        </div>
      </div>

      {/* Timeline List for Selected Day */}
      {currentDayItems.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-surface-border p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-canvas border border-surface-border flex items-center justify-center mx-auto text-ink-muted">
            <Compass className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">第 {selectedDay} 天尚無行程</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-xs mx-auto">
              點擊右上角「新增節點」排入景點或餐廳，亦可從 Google Sheets 試算表直接匯入！
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary-dark transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增第 {selectedDay} 天第一個活動</span>
          </button>
        </div>
      ) : (
        <div className="relative pl-4 space-y-3 before:absolute before:left-6 before:top-3 before:bottom-3 before:w-0.5 before:bg-surface-border">
          {currentDayItems.map((item) => {
            const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.attraction;
            const CatIcon = cat.icon;

            return (
              <div key={item.id} className="relative flex items-start gap-3 group">
                {/* Timeline Dot & Category Icon */}
                <div className="relative z-10 w-7 h-7 rounded-full bg-surface border-2 border-primary text-primary flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                  <CatIcon className="w-3.5 h-3.5 stroke-[2]" />
                </div>

                {/* Card Body */}
                <div className="flex-1 bg-surface rounded-2xl border border-surface-border p-3.5 shadow-sm hover:border-primary/50 transition-colors space-y-2.5">
                  {/* Top Bar: Time, Category & Title */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                          <Clock className="w-3 h-3" />
                          {item.time}
                        </span>
                        <span className="text-[10px] font-medium text-ink-muted px-1.5 py-0.5 rounded bg-canvas border border-surface-border">
                          {cat.label}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-ink mt-1 tracking-tight">
                        {item.title}
                      </h4>
                      {item.locationName && item.locationName !== item.title && (
                        <div className="flex items-center gap-1 text-xs text-ink-muted mt-0.5">
                          <MapPin className="w-3 h-3 text-terracotta" />
                          <span>{item.locationName}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-ink-muted hover:text-terracotta p-1 transition-colors opacity-70 hover:opacity-100"
                      title="刪除此節點"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <p className="text-xs text-ink/80 bg-canvas/60 rounded-xl p-2.5 border border-surface-border/50 leading-relaxed">
                      {item.notes}
                    </p>
                  )}

                  {/* Three External Media Links (Google Maps, IG Reels, PDF Voucher) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-surface-border/60">
                    {/* Google Maps link */}
                    {item.googleMapsUrl ? (
                      <a
                        href={item.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-canvas hover:bg-surface-hover border border-surface-border text-[11px] font-medium text-ink transition-colors"
                      >
                        <MapPin className="w-3 h-3 text-primary" />
                        <span>Google 地圖導航</span>
                        <ExternalLink className="w-2.5 h-2.5 text-ink-muted" />
                      </a>
                    ) : (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.locationName || item.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-canvas/40 hover:bg-canvas border border-surface-border/60 text-[10px] text-ink-muted transition-colors"
                      >
                        <MapPin className="w-2.5 h-2.5" />
                        <span>搜尋地圖</span>
                      </a>
                    )}

                    {/* Instagram Reels link */}
                    {item.instagramUrl && (
                      <a
                        href={item.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-canvas hover:bg-surface-hover border border-surface-border text-[11px] font-medium text-ink transition-colors"
                      >
                        <Video className="w-3 h-3 text-terracotta" />
                        <span>IG 短影音</span>
                        <ExternalLink className="w-2.5 h-2.5 text-ink-muted" />
                      </a>
                    )}

                    {/* Google Drive PDF link */}
                    {item.pdfUrl && (
                      <a
                        href={item.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-canvas hover:bg-surface-hover border border-surface-border text-[11px] font-medium text-ink transition-colors"
                      >
                        <FileText className="w-3 h-3 text-primary" />
                        <span>門票/憑證 PDF</span>
                        <ExternalLink className="w-2.5 h-2.5 text-ink-muted" />
                      </a>
                    )}

                    {/* Quick Link to Expense shortcut */}
                    <button
                      onClick={() => onLinkToExpense(item)}
                      className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium border border-primary/20 transition-colors"
                      title="為此地點新增記帳支出"
                    >
                      <Receipt className="w-3 h-3" />
                      <span>記此處花費</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Itinerary Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between bg-canvas/40">
              <h3 className="text-sm font-bold text-ink">新增第 {selectedDay} 天行程節點</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-ink-muted hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="overflow-y-auto p-5 space-y-3.5 flex-1 text-xs">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="block font-semibold text-ink mb-1">抵達時間</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-canvas border border-surface-border text-ink focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-ink mb-1">分類類型</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ItineraryCategory)}
                    className="w-full px-2.5 py-2 rounded-xl bg-canvas border border-surface-border text-ink focus:outline-none focus:border-primary"
                  >
                    <option value="attraction">景點活動</option>
                    <option value="food">美食餐廳</option>
                    <option value="transport">交通接駁</option>
                    <option value="hotel">飯店住宿</option>
                    <option value="note">備忘手帳</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">
                  活動/景點標題 <span className="text-terracotta">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例：淺草 今半 壽喜燒午餐"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-canvas border border-surface-border text-ink placeholder:text-ink-light focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">地點名稱或地址</label>
                <input
                  type="text"
                  placeholder="例：淺草今半 國際通本店"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-canvas border border-surface-border text-ink placeholder:text-ink-light focus:outline-none focus:border-primary"
                />
              </div>

              {/* External Media Links (Google Maps, IG, PDF) */}
              <div className="space-y-2 pt-2 border-t border-surface-border/60">
                <span className="text-[11px] font-bold text-ink-muted">外部媒體與憑證掛載</span>
                <div>
                  <input
                    type="url"
                    placeholder="🗺️ Google Maps 導航連結 (https://maps.google.com/...)"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-canvas border border-surface-border text-[11px] text-ink placeholder:text-ink-light focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <input
                    type="url"
                    placeholder="🎬 Instagram Reels 短影音連結 (https://www.instagram.com/...)"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-canvas border border-surface-border text-[11px] text-ink placeholder:text-ink-light focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <input
                    type="url"
                    placeholder="📄 Google Drive 門票憑證 PDF 連結 (https://drive.google.com/...)"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-canvas border border-surface-border text-[11px] text-ink placeholder:text-ink-light focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">備註心得與預約說明</label>
                <textarea
                  rows={2}
                  placeholder="例：已預約 3 位，須提早 10 分鐘抵達"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-canvas border border-surface-border text-ink placeholder:text-ink-light focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl font-medium text-ink-muted hover:text-ink transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl font-bold bg-primary text-white hover:bg-primary-dark transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>加入行程</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Google Sheets Sync */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-surface-border shadow-2xl p-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-ink">從 Google Sheets 同步行程</h3>
              </div>
              <button
                onClick={() => setIsSyncModalOpen(false)}
                className="text-ink-muted hover:text-ink p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-ink-muted leading-relaxed">
              將您的 Google 試算表（檔案 ➔ 共用 ➔ 發布到網路 ➔ 選擇 CSV 格式）網址貼在下方，即可一鍵將景點、Google 地圖、IG 影片與 PDF 連結拉取到手機本機端快取！
            </p>

            {syncError && (
              <div className="p-2.5 rounded-xl bg-terracotta/10 border border-terracotta/30 text-terracotta flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-tight">{syncError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-ink mb-1">Google Sheets CSV 發布連結</label>
              <input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                value={sheetUrlInput}
                onChange={(e) => setSheetUrlInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-canvas border border-surface-border text-ink placeholder:text-ink-light font-mono text-[11px] focus:outline-none focus:border-primary"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl font-medium text-ink-muted hover:text-ink"
              >
                取消
              </button>
              <button
                type="button"
                disabled={syncLoading}
                onClick={handleSyncFromSheets}
                className="px-4 py-1.5 rounded-xl font-bold bg-primary text-white hover:bg-primary-dark transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                <span>{syncLoading ? '正在同步下載...' : '立即下載同步'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

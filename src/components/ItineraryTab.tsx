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
  AlertCircle,
  Download,
  Copy
} from 'lucide-react';
import type { Trip, ItineraryItem, ItineraryCategory } from '../types';
import { fetchGoogleSheetBundle } from '../services/sheets';

interface ItineraryTabProps {
  trip: Trip;
  items: ItineraryItem[];
  onSaveItems: (items: ItineraryItem[]) => void;
  onLinkToExpense: (item: ItineraryItem) => void;
  onUpdateTrip?: (updatedTrip: Trip) => void;
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
  onUpdateTrip,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState(trip.sheetCsvUrl || '');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncType, setSyncType] = useState<'gas' | 'csv'>('gas');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedGas, setCopiedGas] = useState(false);

  const handleCopyGas = async () => {
    try {
      const res = await fetch('/GiraTrip_GAS.js');
      if (res.ok) {
        const text = await res.text();
        await navigator.clipboard.writeText(text);
      } else {
        await navigator.clipboard.writeText('請點擊右側「下載 GAS 檔」取得完整 Code.js');
      }
    } catch {
      await navigator.clipboard.writeText('請點擊右側「下載 GAS 檔」取得完整 Code.js');
    }
    setCopiedGas(true);
    setTimeout(() => setCopiedGas(false), 2000);
  };

  const sampleCsvContent = `Day,Time,Category,Title,Location,Notes,GoogleMaps,Instagram,PDF
1,09:30,交通,成田機場搭乘 Skyliner,成田國際機場,憑 QR Code 至京成電鐵櫃台換實體票,https://maps.app.goo.gl/sampleAirport,https://www.instagram.com/reel/sampleTransit,https://drive.google.com/file/d/sampleSkylinerTicket/view
1,11:30,住宿,上野三井花園飯店 Check-in,東京都台東區上野東上野3-19-7,先寄放大件行李與護照登記,https://maps.app.goo.gl/sampleHotel,https://www.instagram.com/reel/sampleHotelReview,https://drive.google.com/file/d/sampleHotelBooking/view
1,13:00,美食,淺草今半 壽喜燒午餐,東京都台東區西淺草3-1-12,必點百年極上牛壽喜燒定食，午間套餐超划算,https://maps.app.goo.gl/sampleSukiyaki,https://www.instagram.com/reel/sampleFoodReel,https://drive.google.com/file/d/sampleMenuReservation/view
1,15:00,景點,淺草寺雷門與仲見世商店街,東京都台東區淺草2-3-1,拍照雷門大燈籠，買人形燒與抹茶冰淇淋,https://maps.app.goo.gl/sampleSensoji,https://www.instagram.com/reel/sampleSensojiVlog,
2,09:00,景點,澀谷 Shibuya Sky 觀景台,東京都澀谷區澀谷2-24-12,門票已在 Klook 預訂 09:30 場次，須掃描 PDF QR Code 進場,https://maps.app.goo.gl/sampleShibuyaSky,https://www.instagram.com/reel/sampleSkyReels,https://drive.google.com/file/d/sampleSkyTicket/view
2,12:30,美食,極味屋 炭火漢堡排,澀谷 PARCO B1,需排隊約 30 分鐘，鐵板生牛肉漢堡排招牌,https://maps.app.goo.gl/sampleKiwamiya,https://www.instagram.com/reel/sampleBurgerReel,
2,15:30,備忘,新宿伊勢丹 退稅手續,東京都新宿區新宿3-14-1,本館 6F 退稅櫃台需出示護照實體與當日發票,https://maps.app.goo.gl/sampleIsetan,,`;

  const handleDownloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'giratrip_itinerary_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(sampleCsvContent);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

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
      setSyncError('請輸入有效的 Google Apps Script 網頁應用程式網址或 Google Sheets 發布網址');
      return;
    }
    setSyncLoading(true);
    setSyncError(null);
    try {
      const bundle = await fetchGoogleSheetBundle(sheetUrlInput, trip.id);
      if (bundle.items.length === 0) {
        setSyncError('未在試算表中讀取到任何有效行程資料，請確認欄位格式');
      } else {
        // Update itinerary items
        onSaveItems(bundle.items);
        if (onUpdateTrip) {
          onUpdateTrip({
            ...trip,
            title: bundle.tripTitle || trip.title,
            members: bundle.members && bundle.members.length > 0 ? bundle.members : trip.members,
            sheetCsvUrl: sheetUrlInput.trim(),
            updatedAt: new Date().toISOString(),
          });
        }
        setIsSyncModalOpen(false);
      }
    } catch (err: any) {
      setSyncError(err?.message || '同步失敗，請檢查網址或試算表權限');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Action Header & Day Selector */}
      <div className="bg-surface rounded-3xl border border-surface-border p-4 shadow-tactile space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink">行程天數</span>
            <span className="text-[10px] text-ink-muted">點選切換每日時間軸</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync from Google Sheet button */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="px-3 py-1.5 rounded-2xl bg-canvas border border-surface-border text-[11px] font-semibold text-ink hover:border-primary transition-all shadow-tactile-sm flex items-center gap-1.5 active:shadow-tactile-inset"
              title="從 Google Sheets 試算表同步行程"
            >
              <RefreshCw className="w-3 h-3 text-primary" />
              <span>同步試算表</span>
            </button>

            {/* Add Spot button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 rounded-2xl bg-primary text-white text-[11px] font-bold hover:bg-primary-dark transition-all flex items-center gap-1 shadow-tactile-sm active:shadow-tactile-inset"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>新增節點</span>
            </button>
          </div>
        </div>

        {/* Days Tabs (Scrollable on mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {daysArray.map((day) => {
            const isSelected = selectedDay === day;
            const count = items.filter((it) => it.dayNumber === day).length;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-primary text-white shadow-tactile-sm'
                    : 'bg-canvas text-ink hover:bg-surface border border-surface-border'
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
            className="flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-semibold bg-canvas border border-dashed border-surface-border text-ink-muted hover:text-ink hover:border-primary transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>加天數</span>
          </button>
        </div>
      </div>

      {/* Timeline List for Selected Day */}
      {currentDayItems.length === 0 ? (
        <div className="bg-surface rounded-3xl border border-surface-border p-10 text-center space-y-3 shadow-tactile">
          <div className="w-12 h-12 rounded-2xl bg-canvas border border-surface-border flex items-center justify-center mx-auto text-ink-muted shadow-tactile-sm">
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all shadow-tactile-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>新增第 {selectedDay} 天第一個活動</span>
          </button>
        </div>
      ) : (
        <div className="relative pl-4 space-y-3.5 before:absolute before:left-7 before:top-4 before:bottom-4 before:w-[1.5px] before:bg-surface-border">
          {currentDayItems.map((item) => {
            const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.attraction;
            const CatIcon = cat.icon;

            return (
              <div key={item.id} className="relative flex items-start gap-3.5 group">
                {/* Timeline Dot & Category Icon */}
                <div className="relative z-10 w-9 h-9 rounded-2xl bg-surface border border-surface-border text-primary flex items-center justify-center flex-shrink-0 shadow-tactile-sm mt-1">
                  <CatIcon className="w-4 h-4 stroke-[2]" />
                </div>

                {/* Card Body */}
                <div className="flex-1 bg-surface rounded-3xl border border-surface-border p-4 sm:p-5 shadow-tactile hover:shadow-tactile-lg transition-all space-y-3">
                  {/* Top Bar: Time, Category & Title */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                          <Clock className="w-3 h-3" />
                          {item.time}
                        </span>
                        <span className="text-[10px] font-bold text-ink-muted px-2 py-0.5 rounded-full bg-canvas border border-surface-border">
                          {cat.label}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-ink mt-1.5 tracking-tight">
                        {item.title}
                      </h4>
                      {item.locationName && item.locationName !== item.title && (
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-0.5">
                          <MapPin className="w-3 h-3 text-terracotta" />
                          <span>{item.locationName}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-ink-muted hover:text-terracotta p-1.5 rounded-xl hover:bg-canvas transition-colors opacity-70 hover:opacity-100"
                      title="刪除此節點"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <p className="text-xs text-ink/80 bg-canvas rounded-2xl p-3 border border-surface-border/60 leading-relaxed font-normal">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-canvas hover:bg-surface-hover border border-surface-border text-[11px] font-semibold text-ink transition-all shadow-tactile-sm"
                      >
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span>Google 地圖導航</span>
                        <ExternalLink className="w-2.5 h-2.5 text-ink-muted" />
                      </a>
                    ) : (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.locationName || item.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-canvas/60 hover:bg-canvas border border-surface-border/60 text-[10px] text-ink-muted transition-colors font-medium"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>搜尋地圖</span>
                      </a>
                    )}

                    {/* Instagram Reels link */}
                    {item.instagramUrl && (
                      <a
                        href={item.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-canvas hover:bg-surface-hover border border-surface-border text-[11px] font-semibold text-ink transition-all shadow-tactile-sm"
                      >
                        <Video className="w-3.5 h-3.5 text-terracotta" />
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-canvas hover:bg-surface-hover border border-surface-border text-[11px] font-semibold text-ink transition-all shadow-tactile-sm"
                      >
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span>門票/憑證 PDF</span>
                        <ExternalLink className="w-2.5 h-2.5 text-ink-muted" />
                      </a>
                    )}

                    {/* Quick Link to Expense shortcut */}
                    <button
                      onClick={() => onLinkToExpense(item)}
                      className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold border border-primary/20 transition-all shadow-tactile-sm"
                      title="為此地點新增記帳支出"
                    >
                      <Receipt className="w-3.5 h-3.5" />
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

            <div className="flex rounded-2xl bg-canvas p-1 border border-surface-border">
              <button
                type="button"
                onClick={() => setSyncType('gas')}
                className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all ${
                  syncType === 'gas'
                    ? 'bg-surface text-primary shadow-tactile-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Google Apps Script (推薦)
              </button>
              <button
                type="button"
                onClick={() => setSyncType('csv')}
                className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all ${
                  syncType === 'csv'
                    ? 'bg-surface text-primary shadow-tactile-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                傳統 CSV 發布
              </button>
            </div>

            {syncType === 'gas' ? (
              /* Google Apps Script Guide & Script Download */
              <div className="bg-canvas border border-surface-border rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-ink text-xs">GAS 雲端專屬後端腳本</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyGas}
                      className="flex items-center gap-1 px-2 py-1 rounded-xl bg-surface border border-surface-border text-ink hover:text-primary transition-all text-[11px] font-bold shadow-tactile-sm"
                      title="複製 GAS 腳本程式碼"
                    >
                      {copiedGas ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedGas ? '已複製' : '複製腳本'}</span>
                    </button>
                    <a
                      href="/GiraTrip_GAS.js"
                      download="GiraTrip_GAS.js"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary text-white hover:bg-primary-dark transition-all text-[11px] font-bold shadow-tactile-sm"
                      title="下載 GiraTrip_GAS.js"
                    >
                      <Download className="w-3 h-3" />
                      <span>下載 GAS 檔</span>
                    </a>
                  </div>
                </div>

                <div className="text-[11px] text-ink-muted leading-relaxed space-y-1">
                  <p className="font-bold text-ink">3 步驟升級為雲端 API：</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-[10px]">
                    <li>在 Google 試算表點「<b>擴充功能</b>」➔「<b>Apps Script</b>」，貼上腳本。</li>
                    <li>點選單「<b>🦌 GiraTrip 記啦旅</b>」➔「<b>一鍵建立所有工作表</b>」（自動生成冷杉綠欄位與防呆驗證）。</li>
                    <li>點右上角「<b>部署</b>」➔「<b>新增部署作業</b>」➔ 種類選「<b>網頁應用程式</b>」➔ 存取權選「<b>所有人 (Anyone)</b>」➔ 複製網址貼入下方！</li>
                  </ol>
                </div>

                <div className="pt-1.5 border-t border-surface-border/60 text-[10px] text-primary font-medium">
                  🔒 支援管理者權限控管：Firebase 金鑰與 Gemini Key 存放於試算表，一般旅伴呼叫 API 絕不外洩！
                </div>
              </div>
            ) : (
              /* Traditional CSV Guide */
              <div className="bg-canvas border border-surface-border rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-ink text-xs">試算表 CSV 欄位規範</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyTemplate}
                      className="flex items-center gap-1 px-2 py-1 rounded-xl bg-surface border border-surface-border text-ink hover:text-primary transition-all text-[11px] font-bold shadow-tactile-sm"
                      title="複製 CSV 範例內容至剪貼簿"
                    >
                      {copiedTemplate ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedTemplate ? '已複製' : '複製文字'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary text-white hover:bg-primary-dark transition-all text-[11px] font-bold shadow-tactile-sm"
                      title="下載 .csv 範本檔案"
                    >
                      <Download className="w-3 h-3" />
                      <span>下載範本 CSV</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-ink-muted leading-relaxed space-y-1.5">
                  <p>試算表第 1 列請填入 9 個標準欄位標題：</p>
                  <div className="p-2 rounded-xl bg-surface border border-surface-border font-mono text-[10px] text-primary font-bold overflow-x-auto whitespace-nowrap">
                    Day, Time, Category, Title, Location, Notes, GoogleMaps, Instagram, PDF
                  </div>
                </div>

                <div className="pt-2 border-t border-surface-border/60 text-[10px] text-ink-muted leading-tight">
                  <b>發布教學</b>：Google 試算表 ➔「檔案」➔「共用」➔「發布到網路」➔ 格式選「<b>逗號分隔值 (.csv)</b>」➔ 複製網址貼入下方。
                </div>
              </div>
            )}

            {syncError && (
              <div className="p-2.5 rounded-xl bg-terracotta/10 border border-terracotta/30 text-terracotta flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-tight">{syncError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-ink mb-1">
                {syncType === 'gas' ? 'Google Apps Script 網頁應用程式網址' : 'Google Sheets CSV 發布連結'}
              </label>
              <input
                type="url"
                placeholder={
                  syncType === 'gas'
                    ? 'https://script.google.com/macros/s/.../exec'
                    : 'https://docs.google.com/spreadsheets/d/.../pub?output=csv'
                }
                value={sheetUrlInput}
                onChange={(e) => setSheetUrlInput(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl bg-canvas border border-surface-border text-ink placeholder:text-ink-light font-mono text-[11px] focus:outline-none focus:border-primary shadow-tactile-sm"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-2xl font-medium text-ink-muted hover:text-ink"
              >
                取消
              </button>
              <button
                type="button"
                disabled={syncLoading}
                onClick={handleSyncFromSheets}
                className="min-h-[44px] px-5 py-2 rounded-2xl font-bold bg-primary text-white hover:bg-primary-dark transition-colors flex items-center gap-1.5 shadow-tactile-sm disabled:opacity-50"
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

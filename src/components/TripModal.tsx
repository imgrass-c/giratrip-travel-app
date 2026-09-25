import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar, MapPin, Coins, Users, Check } from 'lucide-react';
import type { Trip, Member, CurrencyCode } from '../types';

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTrip: (tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialTrip?: Trip | null;
}

const AVAILABLE_CURRENCIES: CurrencyCode[] = ['TWD', 'JPY', 'KRW', 'USD', 'EUR', 'THB'];
const MEMBER_COLORS = ['#526655', '#8A6B58', '#6B7A82', '#946B54', '#59695F', '#7E6B80'];

export const TripModal: React.FC<TripModalProps> = ({
  isOpen,
  onClose,
  onSaveTrip,
  initialTrip,
}) => {
  const [title, setTitle] = useState(initialTrip?.title || '');
  const [destination, setDestination] = useState(initialTrip?.destination || '');
  const [startDate, setStartDate] = useState(initialTrip?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialTrip?.endDate || new Date().toISOString().split('T')[0]);
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>(initialTrip?.baseCurrency || 'TWD');
  const [sheetCsvUrl, setSheetCsvUrl] = useState(initialTrip?.sheetCsvUrl || '');
  const [members, setMembers] = useState<Member[]>(
    initialTrip?.members || [
      { id: 'm_me', name: '我 (主記人)', avatarColor: '#526655', isDefaultPayer: true },
      { id: `m_${Date.now()}_1`, name: '旅伴 1', avatarColor: '#8A6B58' },
    ]
  );
  const [newMemberName, setNewMemberName] = useState('');

  if (!isOpen) return null;

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const color = MEMBER_COLORS[members.length % MEMBER_COLORS.length];
    setMembers([
      ...members,
      {
        id: `m_${Date.now()}`,
        name: newMemberName.trim(),
        avatarColor: color,
      },
    ]);
    setNewMemberName('');
  };

  const handleRemoveMember = (id: string) => {
    if (members.length <= 1) return;
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSaveTrip({
      title: title.trim(),
      destination: destination.trim() || '未設定地點',
      startDate,
      endDate,
      baseCurrency,
      members,
      sheetCsvUrl: sheetCsvUrl.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between bg-canvas/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-ink">
              {initialTrip ? '編輯旅程設定' : '建立全新旅程'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              旅程名稱 <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例：2026 東京春櫻美食漫步"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-surface-border text-sm text-ink placeholder:text-ink-light focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Destination & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-ink-muted" />
                <span>目的地</span>
              </label>
              <input
                type="text"
                placeholder="例：日本 東京"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-surface-border text-sm text-ink placeholder:text-ink-light focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-ink-muted" />
                <span>主要結算幣別</span>
              </label>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-surface-border text-sm text-ink focus:outline-none focus:border-primary transition-colors"
              >
                {AVAILABLE_CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr} ({curr === 'TWD' ? '新台幣' : curr === 'JPY' ? '日圓' : curr === 'KRW' ? '韓元' : curr === 'USD' ? '美元' : curr === 'EUR' ? '歐元' : '泰銖'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                <span>出發日期</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-canvas border border-surface-border text-xs sm:text-sm text-ink focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                <span>結束日期</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-canvas border border-surface-border text-xs sm:text-sm text-ink focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Members Management */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-ink-muted" />
                <span>旅伴成員 ({members.length} 人)</span>
              </div>
              <span className="text-[10px] text-ink-muted">用於記帳分攤與清算</span>
            </label>
            <div className="space-y-2 mb-2.5">
              {members.map((member, idx) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-canvas border border-surface-border/80 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: member.avatarColor }}
                    />
                    <span className="font-medium text-ink">{member.name}</span>
                    {idx === 0 && (
                      <span className="text-[10px] px-1 rounded bg-primary/10 text-primary border border-primary/20">
                        預設主記人
                      </span>
                    )}
                  </div>
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-ink-muted hover:text-terracotta p-1 transition-colors"
                      title="移除成員"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Member Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="輸入旅伴稱呼（例：Leo）"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-xl bg-canvas border border-surface-border text-xs text-ink placeholder:text-ink-light focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleAddMember}
                className="px-3 py-1.5 rounded-xl bg-surface-hover border border-surface-border text-xs font-medium text-ink hover:border-primary flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增成員</span>
              </button>
            </div>
          </div>

          {/* Optional Google Sheet CSV Url */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              Google Sheets 靜態行程 CSV 連結 (可選)
            </label>
            <input
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
              value={sheetCsvUrl}
              onChange={(e) => setSheetCsvUrl(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-canvas border border-surface-border text-xs text-ink placeholder:text-ink-light focus:outline-none focus:border-primary font-mono text-[11px]"
            />
            <p className="text-[10px] text-ink-muted mt-1">
              可填寫已發布為 CSV 的 Google 試算表連結，後續可在行程頁一鍵同步景點、地圖與 IG 影片。
            </p>
          </div>

          {/* Footer Submit Button */}
          <div className="pt-2 flex justify-end gap-2 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-dark transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>{initialTrip ? '儲存變更' : '立即建立旅程'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

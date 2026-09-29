import React, { useState } from 'react';
import { 
  Plus, 
  Receipt, 
  Trash2, 
  Utensils, 
  Car, 
  Ticket, 
  ShoppingBag, 
  Hotel, 
  CreditCard, 
  Calendar, 
  Users, 
  Check, 
  X, 
  Coins,
  MapPin,
  Search
} from 'lucide-react';
import type { Trip, Expense, CurrencyCode, ItineraryItem } from '../types';
import { DEFAULT_EXCHANGE_RATES, loadExchangeRates } from '../services/storage';

interface ExpenseTabProps {
  trip: Trip;
  expenses: Expense[];
  itineraryItems: ItineraryItem[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  prefilledItineraryItem?: ItineraryItem | null;
  onClearPrefilledItineraryItem?: () => void;
}

const CATEGORY_CONFIG: Record<Expense['category'], { label: string; icon: React.FC<{ className?: string }> }> = {
  dining: { label: '餐飲美食', icon: Utensils },
  traffic: { label: '交通移動', icon: Car },
  ticket: { label: '門票活動', icon: Ticket },
  shopping: { label: '購物採買', icon: ShoppingBag },
  stay: { label: '住宿飯店', icon: Hotel },
  other: { label: '其他費用', icon: CreditCard },
};

const CURRENCY_LIST: CurrencyCode[] = ['JPY', 'TWD', 'KRW', 'USD', 'EUR', 'THB'];

export const ExpenseTab: React.FC<ExpenseTabProps> = ({
  trip,
  expenses,
  itineraryItems,
  onAddExpense,
  onDeleteExpense,
  prefilledItineraryItem,
  onClearPrefilledItineraryItem,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(!!prefilledItineraryItem);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const customRates = loadExchangeRates();

  // Form states
  const [title, setTitle] = useState(prefilledItineraryItem ? `${prefilledItineraryItem.title} 開銷` : '');
  const [category, setCategory] = useState<Expense['category']>('dining');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [originalCurrency, setOriginalCurrency] = useState<CurrencyCode>(trip.baseCurrency === 'JPY' ? 'JPY' : 'JPY');
  const [originalAmount, setOriginalAmount] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(customRates[originalCurrency] || 1);
  const [paidById, setPaidById] = useState<string>(trip.members[0]?.id || '');
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>(trip.members.map((m) => m.id));
  const [linkedItineraryItemId, setLinkedItineraryItemId] = useState<string>(prefilledItineraryItem?.id || '');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate totals
  const totalBaseSpent = expenses.reduce((sum, e) => sum + e.amountInBaseCurrency, 0);

  // When currency changes, update default exchange rate
  const handleCurrencyChange = (curr: CurrencyCode) => {
    setOriginalCurrency(curr);
    const rate = curr === trip.baseCurrency ? 1.0 : (customRates[curr] || DEFAULT_EXCHANGE_RATES[curr] || 1.0);
    setExchangeRate(rate);
  };

  const handleToggleMember = (memberId: string) => {
    if (splitMemberIds.includes(memberId)) {
      if (splitMemberIds.length > 1) {
        setSplitMemberIds(splitMemberIds.filter((id) => id !== memberId));
      }
    } else {
      setSplitMemberIds([...splitMemberIds, memberId]);
    }
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const numAmount = parseFloat(originalAmount);
    if (isNaN(numAmount) || numAmount <= 0 || !title.trim()) return;

    const safeRate = isNaN(exchangeRate) || exchangeRate <= 0 ? 1 : exchangeRate;
    const baseAmount = Math.round(numAmount * safeRate);

    setIsSubmitting(true);
    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      tripId: trip.id,
      title: title.trim(),
      category,
      date,
      originalCurrency,
      originalAmount: numAmount,
      exchangeRate: safeRate,
      amountInBaseCurrency: baseAmount,
      paidById: paidById || trip.members[0]?.id || '',
      splitType: splitMemberIds.length === trip.members.length ? 'equal' : 'custom_itemized',
      splitMemberIds,
      linkedItineraryItemId: linkedItineraryItemId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddExpense(newExpense);
    setIsAddModalOpen(false);
    setIsSubmitting(false);
    if (onClearPrefilledItineraryItem) onClearPrefilledItineraryItem();
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setOriginalAmount('');
    setCategory('dining');
    setLinkedItineraryItemId('');
    setSplitMemberIds(trip.members.map((m) => m.id));
  };

  // Filtered expenses
  const filteredExpenses = expenses
    .filter((e) => {
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4 pb-20">
      {/* Spend Summary Header */}
      <div className="bg-surface rounded-3xl border border-surface-border p-5 shadow-tactile">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-ink-muted tracking-wide">旅程累計總開銷</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-ink tracking-tight">
                {totalBaseSpent.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                {trip.baseCurrency}
              </span>
            </div>
            <p className="text-[11px] font-medium text-ink-muted mt-1">共 {expenses.length} 筆支出紀錄</p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-tactile-sm active:shadow-tactile-inset"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>記一筆帳</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="搜尋支出項目或店名..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-surface border border-surface-border text-xs text-ink placeholder:text-ink-light focus:outline-none focus:border-primary shadow-tactile-sm transition-all"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3.5 py-2.5 rounded-2xl bg-surface border border-surface-border text-xs font-semibold text-ink focus:outline-none focus:border-primary shadow-tactile-sm transition-all"
        >
          <option value="all">全部分類</option>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* Expense List */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-surface rounded-3xl border border-surface-border p-10 text-center space-y-2.5 shadow-tactile">
          <div className="w-12 h-12 rounded-2xl bg-canvas border border-surface-border flex items-center justify-center mx-auto text-ink-muted shadow-tactile-sm">
            <Receipt className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h4 className="text-xs font-bold text-ink">尚無此條件的記帳紀錄</h4>
          <p className="text-[11px] text-ink-muted max-w-xs mx-auto">
            旅行中的每一筆消費隨手記，長頸鹿幫你清清楚楚分帳！
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => {
            const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.other;
            const CatIcon = cat.icon;
            const payer = trip.members.find((m) => m.id === expense.paidById);
            const linkedSpot = itineraryItems.find((it) => it.id === expense.linkedItineraryItemId);

            return (
              <div
                key={expense.id}
                className="bg-surface rounded-3xl border border-surface-border p-4 sm:p-5 shadow-tactile hover:shadow-tactile-lg transition-all flex items-center justify-between gap-3 group"
              >
                {/* Left: Category Icon & Details */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-canvas border border-surface-border flex items-center justify-center text-primary flex-shrink-0 mt-0.5 shadow-tactile-sm">
                    <CatIcon className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-extrabold text-ink truncate">{expense.title}</h4>
                      <span className="text-[10px] font-bold text-ink-muted px-2 py-0.5 rounded-full bg-canvas border border-surface-border">
                        {cat.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-ink-muted mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3" />
                        {expense.date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold text-ink">
                        <div
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: payer?.avatarColor || '#D97706' }}
                        />
                        {payer?.name || '未知代墊者'} 先付
                      </span>
                      <span>•</span>
                      <span className="font-medium">
                        {expense.splitMemberIds.length === trip.members.length
                          ? '全員均攤'
                          : `${expense.splitMemberIds.length} 人分攤`}
                      </span>
                    </div>

                    {/* Linked Spot Badge if attached */}
                    {linkedSpot && (
                      <div className="inline-flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 mt-2 font-medium">
                        <MapPin className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[160px]">{linkedSpot.title}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Amounts & Delete */}
                <div className="text-right flex-shrink-0">
                  <div className="text-base font-extrabold text-ink tracking-tight">
                    {expense.amountInBaseCurrency.toLocaleString()}{' '}
                    <span className="text-[10px] font-semibold text-ink-muted">{trip.baseCurrency}</span>
                  </div>
                  {expense.originalCurrency !== trip.baseCurrency && (
                    <div className="text-[10px] text-ink-muted font-mono font-medium">
                      {expense.originalAmount.toLocaleString()} {expense.originalCurrency}
                    </div>
                  )}

                  <button
                    onClick={() => onDeleteExpense(expense.id)}
                    className="text-ink-muted hover:text-terracotta p-1.5 rounded-xl hover:bg-canvas transition-colors mt-1 opacity-60 hover:opacity-100"
                    title="刪除此筆記帳"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Expense */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between bg-canvas/40">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-ink">新增支出花費</h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  if (onClearPrefilledItineraryItem) onClearPrefilledItineraryItem();
                }}
                className="p-1 rounded-lg text-ink-muted hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="overflow-y-auto p-5 space-y-3.5 flex-1 text-xs">
              {/* Title & Category */}
              <div>
                <label className="block font-semibold text-ink mb-1">
                  消費項目名稱 <span className="text-terracotta">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例：今半黑毛和牛壽喜燒定食"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-canvas border border-surface-border text-ink placeholder:text-ink-light focus:outline-none focus:border-primary text-xs"
                />
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    金額 <span className="text-terracotta">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={originalAmount}
                    onChange={(e) => setOriginalAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-canvas border border-surface-border text-sm font-bold text-ink focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">幣別</label>
                  <select
                    value={originalCurrency}
                    onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                    className="w-full px-3 py-2 rounded-xl bg-canvas border border-surface-border text-xs text-ink focus:outline-none focus:border-primary"
                  >
                    {CURRENCY_LIST.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Exchange rate display and live conversion */}
              {originalCurrency !== trip.baseCurrency && (
                <div className="p-2.5 rounded-xl bg-canvas border border-surface-border/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-ink-muted">
                    <Coins className="w-3.5 h-3.5 text-primary" />
                    <span>換算匯率 (1 {originalCurrency} = )</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                      className="w-20 px-2 py-0.5 rounded bg-surface border border-surface-border font-mono text-[11px] text-ink focus:outline-none"
                    />
                    <span>{trip.baseCurrency}</span>
                  </div>
                  <div className="font-bold text-ink">
                    約{' '}
                    {originalAmount
                      ? Math.round((parseFloat(originalAmount) || 0) * exchangeRate).toLocaleString()
                      : 0}{' '}
                    {trip.baseCurrency}
                  </div>
                </div>
              )}

              {/* Category & Date */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-ink mb-1">費用分類</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Expense['category'])}
                    className="w-full px-3 py-2 rounded-xl bg-canvas border border-surface-border text-xs text-ink focus:outline-none focus:border-primary"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([k, cfg]) => (
                      <option key={k} value={k}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">消費日期</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-canvas border border-surface-border text-xs text-ink focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Payer selection */}
              <div>
                <label className="block font-semibold text-ink mb-1.5 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-ink-muted" />
                  <span>誰先代墊付款？</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {trip.members.map((member) => {
                    const isSelected = paidById === member.id;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setPaidById(member.id)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-canvas text-ink border-surface-border hover:bg-surface-hover'
                        }`}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: isSelected ? '#FFFFFF' : member.avatarColor }}
                        />
                        <span className="truncate">{member.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Split members checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-ink flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-ink-muted" />
                    <span>分攤對象（誰有份？）</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSplitMemberIds(trip.members.map((m) => m.id))}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    全部人都分
                  </button>
                </div>
                <div className="space-y-1.5 bg-canvas rounded-xl p-2.5 border border-surface-border/80">
                  {trip.members.map((member) => {
                    const isChecked = splitMemberIds.includes(member.id);
                    return (
                      <label
                        key={member.id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-hover cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMember(member.id)}
                            className="rounded border-surface-border text-primary focus:ring-primary w-3.5 h-3.5"
                          />
                          <span className="text-xs text-ink font-medium">{member.name}</span>
                        </div>
                        {isChecked && (
                          <span className="text-[10px] text-ink-muted">
                            分攤約{' '}
                            {originalAmount && splitMemberIds.length > 0
                              ? Math.round(
                                  ((parseFloat(originalAmount) || 0) * exchangeRate) / splitMemberIds.length
                                ).toLocaleString()
                              : 0}{' '}
                            {trip.baseCurrency}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Optional Link to Itinerary item */}
              {itineraryItems.length > 0 && (
                <div>
                  <label className="block font-semibold text-ink mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-ink-muted" />
                    <span>關聯至行程節點 (選填)</span>
                  </label>
                  <select
                    value={linkedItineraryItemId}
                    onChange={(e) => setLinkedItineraryItemId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-canvas border border-surface-border text-xs text-ink focus:outline-none focus:border-primary truncate"
                  >
                    <option value="">不關聯行程節點</option>
                    {itineraryItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        第 {it.dayNumber} 天 {it.time} - {it.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="pt-2 flex justify-end gap-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    if (onClearPrefilledItineraryItem) onClearPrefilledItineraryItem();
                  }}
                  className="px-3.5 py-1.5 rounded-xl font-medium text-ink-muted hover:text-ink"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl font-bold bg-primary text-white hover:bg-primary-dark transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>儲存此筆支出</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Scale, 
  ArrowRight, 
  Copy, 
  Check, 
  Users, 
  Share2, 
  TrendingUp, 
  TrendingDown 
} from 'lucide-react';
import type { Trip, Expense } from '../types';
import { 
  calculateMemberBalances, 
  calculateMinimumCashFlow, 
  generateSettlementShareText 
} from '../services/settlement';

interface SettlementTabProps {
  trip: Trip;
  expenses: Expense[];
}

export const SettlementTab: React.FC<SettlementTabProps> = ({
  trip,
  expenses,
}) => {
  const [copied, setCopied] = useState(false);

  const balances = calculateMemberBalances(trip.members, expenses);
  const settlements = calculateMinimumCashFlow(trip.members, expenses, trip.baseCurrency);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amountInBaseCurrency, 0);

  const handleCopyText = async () => {
    const text = generateSettlementShareText(trip.title, trip.members, expenses, trip.baseCurrency);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header Card */}
      <div className="bg-surface rounded-2xl border border-surface-border p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-ink-muted">旅程總結算金額</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-ink tracking-tight">
                {totalSpent.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-primary">{trip.baseCurrency}</span>
            </div>
            <p className="text-[10px] text-ink-muted mt-0.5">
              {trip.members.length} 位旅伴 • 最佳化最少轉帳僅需 {settlements.length} 筆結清
            </p>
          </div>

          <button
            onClick={handleCopyText}
            className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors flex items-center gap-1.5 shadow-sm"
            title="複製純文字結算清單，方便貼到聊天室"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '已複製到剪貼簿' : '複製文字清單'}</span>
          </button>
        </div>
      </div>

      {/* Minimum Cash Flow Settlement Roadmap */}
      <div className="bg-surface rounded-2xl border border-surface-border p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
          <div className="flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-ink">最佳化轉帳還款方案 (最少轉帳筆數)</h3>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
            {settlements.length} 筆即結清
          </span>
        </div>

        {settlements.length === 0 ? (
          <div className="p-6 text-center space-y-1 bg-canvas/40 rounded-xl border border-surface-border/50">
            <Check className="w-6 h-6 text-primary mx-auto" />
            <div className="text-xs font-bold text-ink">帳目已完全平衡</div>
            <p className="text-[11px] text-ink-muted">目前所有旅伴皆無欠款，無須轉帳！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {settlements.map((s, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-canvas border border-surface-border flex items-center justify-between gap-3 shadow-xs"
              >
                {/* From Debtor */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-surface-dark border border-surface-border flex items-center justify-center text-[10px] font-bold text-ink">
                    {idx + 1}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-ink block truncate">{s.fromMemberName}</span>
                    <span className="text-[9px] text-ink-muted">應還款</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center flex-shrink-0 px-2">
                  <span className="text-[9px] text-ink-muted font-medium">轉帳給</span>
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>

                {/* To Creditor */}
                <div className="text-right min-w-0">
                  <div className="text-xs font-bold text-ink block truncate">{s.toMemberName}</div>
                  <div className="text-xs font-extrabold text-primary tracking-tight">
                    {s.amount.toLocaleString()} <span className="text-[10px] font-normal">{s.currency}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member Balances Breakdown */}
      <div className="bg-surface rounded-2xl border border-surface-border p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-ink">旅伴個人收支平衡表</h3>
          </div>
        </div>

        <div className="space-y-2">
          {balances.map((b) => {
            const isCreditor = b.netBalance > 0;
            const isDebtor = b.netBalance < 0;

            return (
              <div
                key={b.memberId}
                className="p-3 rounded-xl bg-canvas border border-surface-border flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full border border-surface-border flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: trip.members.find((m) => m.id === b.memberId)?.avatarColor || '#526655' }}
                  >
                    {b.memberName.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-ink truncate">{b.memberName}</h4>
                    <div className="text-[10px] text-ink-muted flex items-center gap-1.5 mt-0.5">
                      <span>代墊 {b.totalPaid.toLocaleString()}</span>
                      <span>•</span>
                      <span>應分攤 {b.totalShouldPay.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div
                    className={`text-xs font-bold flex items-center justify-end gap-1 ${
                      isCreditor ? 'text-primary' : isDebtor ? 'text-terracotta' : 'text-ink-muted'
                    }`}
                  >
                    {isCreditor && <TrendingUp className="w-3 h-3" />}
                    {isDebtor && <TrendingDown className="w-3 h-3" />}
                    <span>
                      {isCreditor ? `應收 +${b.netBalance.toLocaleString()}` : isDebtor ? `應付 ${b.netBalance.toLocaleString()}` : '已平衡 $0'}
                    </span>
                  </div>
                  <span className="text-[10px] text-ink-muted">{trip.baseCurrency}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Export Card Preview (Pure vectors, Zero Emoji) */}
      <div className="bg-canvas rounded-2xl border border-surface-border p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-ink-muted" />
            <span className="text-[11px] font-bold text-ink">結算文字摘要預覽</span>
          </div>
          <button
            onClick={handleCopyText}
            className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            <span>一鍵複製</span>
          </button>
        </div>

        <pre className="p-3 rounded-xl bg-surface border border-surface-border/80 text-[11px] font-mono text-ink/90 overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {generateSettlementShareText(trip.title, trip.members, expenses, trip.baseCurrency)}
        </pre>
      </div>
    </div>
  );
};

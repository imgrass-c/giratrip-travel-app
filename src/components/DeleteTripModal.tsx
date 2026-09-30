import React from 'react';
import { AlertTriangle, Trash2, X, MapPin, Calendar } from 'lucide-react';
import type { Trip } from '../types';

interface DeleteTripModalProps {
  isOpen: boolean;
  trip: Trip | null;
  isOnlyTrip?: boolean;
  onClose: () => void;
  onConfirm: (tripId: string) => void;
}

export const DeleteTripModal: React.FC<DeleteTripModalProps> = ({
  isOpen,
  trip,
  isOnlyTrip = false,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !trip) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-surface border border-surface-border shadow-tactile-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 px-5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-terracotta/10 border border-terracotta/20 flex items-center justify-center text-terracotta">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">刪除旅程確認</h3>
              <p className="text-[10px] text-ink-muted">此動作無法復原，請審慎確認</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
            title="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3.5">
          <div className="p-3.5 rounded-2xl bg-canvas border border-surface-border space-y-1.5">
            <div className="text-xs font-bold text-ink truncate">{trip.title}</div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-muted">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="truncate">{trip.destination || '未設定地點'}</span>
              </div>
              {trip.startDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-ink-muted flex-shrink-0" />
                  <span>
                    {trip.startDate} ~ {trip.endDate}
                  </span>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-ink-muted leading-relaxed">
            確定要刪除這趟旅程嗎？刪除後，該旅程所包含的所有<span className="font-bold text-ink">每日行程規劃</span>、<span className="font-bold text-ink">分攤記帳開銷</span>與<span className="font-bold text-ink">試算表連結</span>都將一併永久移除。
          </p>

          {isOnlyTrip && (
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[11px] leading-tight">
              提示：這是您目前唯一的旅程。刪除後系統將自動為您保留預設示範行程，避免畫面空白。
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-5 border-t border-surface-border bg-canvas/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 rounded-2xl text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trip.id)}
            className="min-h-[40px] px-5 py-2 rounded-2xl text-xs font-bold bg-terracotta text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-tactile-sm active:shadow-tactile-inset"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>確認刪除旅程</span>
          </button>
        </div>
      </div>
    </div>
  );
};

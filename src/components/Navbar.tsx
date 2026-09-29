import React, { useState } from 'react';
import { 
  Plus, 
  ChevronDown, 
  MapPin, 
  FolderSync
} from 'lucide-react';
import type { Trip } from '../types';

interface NavbarProps {
  trips: Trip[];
  activeTrip: Trip;
  onSelectTrip: (tripId: string) => void;
  onOpenNewTripModal: () => void;
  isFirebaseConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  trips,
  activeTrip,
  onSelectTrip,
  onOpenNewTripModal,
  isFirebaseConnected,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-canvas/95 backdrop-blur-md border-b border-surface-border px-4 py-2.5 sm:py-3 shadow-tactile-sm">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
        {/* ROW 1 (Mobile) / Left (Desktop): Brand Logo & Mobile Sync Status */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-tactile-sm flex-shrink-0">
              {/* Elegant Giraffe Vector Icon */}
              <svg 
                className="w-5 h-5 stroke-current fill-none stroke-[2]" 
                viewBox="0 0 24 24" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="15.5" cy="4" r="1.5" />
                <path d="M14 3.5 L12 2" />
                <path d="M16 2.5 L17 1.5" />
                <path d="M14 5.5 C13 7 13 11 12 14" />
                <path d="M16 5.5 C15.5 8 15 12 15 14" />
                <path d="M11 14 C9 14 7 15 6 17 L6 22" />
                <path d="M15 14 C17 14 19 16 19 18 L19 22" />
                <path d="M9 16 L9 22" />
                <path d="M16 16 L16 22" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold tracking-tight text-ink">GiraTrip</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/20 tracking-wide">記啦旅</span>
              </div>
              <p className="text-[10px] font-medium text-ink-muted">長頸鹿全覽行程・花費輕鬆記啦</p>
            </div>
          </div>

          {/* Cloud Sync Status Indicator (Mobile: Top Right) */}
          <div 
            className="flex sm:hidden items-center flex-shrink-0" 
            title={isFirebaseConnected ? 'Firebase 即時同步中 (資料上傳秒級更新)' : 'Local-First 本機存儲模式 (支援離線)'}
          >
            {isFirebaseConnected ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold shadow-tactile-sm">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>即時同步</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface border border-surface-border text-ink-muted text-[10px] font-semibold shadow-tactile-sm">
                <FolderSync className="w-3.5 h-3.5" />
                <span>本機快取</span>
              </div>
            )}
          </div>
        </div>

        {/* ROW 2 (Mobile) / Right (Desktop): Trip Selector & New Trip Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Multi-Trip Selector Dropdown (Full width on mobile) */}
          <div className="relative flex-1 sm:flex-initial">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 min-h-[44px] rounded-2xl bg-surface border border-surface-border text-xs font-semibold text-ink hover:bg-surface-hover transition-all shadow-tactile-sm active:shadow-tactile-inset"
              title="切換或建立旅程"
            >
              <div className="flex items-center gap-2 text-left truncate">
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="truncate font-bold text-ink">{activeTrip.title}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-ink-muted flex-shrink-0 ml-1" />
            </button>

            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setDropdownOpen(false)} 
                />
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-72 rounded-3xl bg-surface border border-surface-border shadow-tactile-lg p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 text-[11px] font-bold text-ink-muted border-b border-surface-border/60">
                    我的所有旅程 ({trips.length})
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1.5 space-y-1">
                    {trips.map((trip) => {
                      const isActive = trip.id === activeTrip.id;
                      return (
                        <button
                          key={trip.id}
                          onClick={() => {
                            onSelectTrip(trip.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 min-h-[44px] rounded-2xl text-xs transition-all flex items-center justify-between ${
                            isActive 
                              ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-tactile-sm' 
                              : 'text-ink hover:bg-surface-hover font-medium'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="truncate font-semibold">{trip.title}</div>
                            <div className="text-[10px] text-ink-muted flex items-center gap-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              <span className="truncate">{trip.destination || '未設定地點'}</span>
                            </div>
                          </div>
                          {isActive && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-1.5 border-t border-surface-border/60 mt-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenNewTripModal();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>建立新旅程</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Create Trip Button (min-h-[44px]) */}
          <button
            onClick={onOpenNewTripModal}
            className="min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5 shadow-tactile-sm active:shadow-tactile-inset flex-shrink-0"
            title="建立新旅程"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="font-bold">新旅程</span>
          </button>

          {/* Cloud Sync Status Indicator (Desktop Only) */}
          <div 
            className="hidden sm:flex items-center flex-shrink-0" 
            title={isFirebaseConnected ? 'Firebase 即時同步中 (資料上傳秒級更新)' : 'Local-First 本機存儲模式 (支援離線)'}
          >
            {isFirebaseConnected ? (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold shadow-tactile-sm">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>即時同步</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface border border-surface-border text-ink-muted text-[10px] font-semibold shadow-tactile-sm">
                <FolderSync className="w-3.5 h-3.5" />
                <span>本機快取</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

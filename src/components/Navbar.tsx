import React, { useState } from 'react';
import { 
  Plus, 
  ChevronDown, 
  MapPin, 
  Cloud, 
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
    <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur-md border-b border-surface-border px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Giraffe Vector Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shadow-sm">
            {/* Elegant Giraffe Vector Icon */}
            <svg 
              className="w-5 h-5 stroke-current fill-none stroke-[1.75]" 
              viewBox="0 0 24 24" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              {/* Giraffe Head & Long Neck */}
              <circle cx="15.5" cy="4" r="1.5" />
              <path d="M14 3.5 L12 2" />
              <path d="M16 2.5 L17 1.5" />
              <path d="M14 5.5 C13 7 13 11 12 14" />
              <path d="M16 5.5 C15.5 8 15 12 15 14" />
              {/* Body */}
              <path d="M11 14 C9 14 7 15 6 17 L6 22" />
              <path d="M15 14 C17 14 19 16 19 18 L19 22" />
              <path d="M9 16 L9 22" />
              <path d="M16 16 L16 22" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-ink">GiraTrip</h1>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary border border-primary/20">記啦旅</span>
            </div>
            <p className="text-[10px] text-ink-muted hidden sm:block">長頸鹿全覽行程・花費輕鬆記啦</p>
          </div>
        </div>

        {/* Multi-Trip Selector Dropdown */}
        <div className="relative flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-xs font-medium text-ink hover:bg-surface-hover transition-colors shadow-sm"
              title="切換或建立旅程"
            >
              <div className="flex items-center gap-1.5 text-left max-w-[130px] sm:max-w-[200px] truncate">
                <span className="truncate">{activeTrip.title}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" />
            </button>

            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-surface border border-surface-border shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted border-b border-surface-border/60">
                    我的所有旅程 ({trips.length})
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
                    {trips.map((trip) => {
                      const isActive = trip.id === activeTrip.id;
                      return (
                        <button
                          key={trip.id}
                          onClick={() => {
                            onSelectTrip(trip.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                            isActive 
                              ? 'bg-primary/15 text-primary font-semibold border border-primary/20' 
                              : 'text-ink hover:bg-surface-hover'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="truncate">{trip.title}</div>
                            <div className="text-[10px] text-ink-muted flex items-center gap-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              <span className="truncate">{trip.destination || '未設定地點'}</span>
                            </div>
                          </div>
                          {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-1 border-t border-surface-border/60 mt-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenNewTripModal();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>建立新旅程</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Create Trip Button */}
          <button
            onClick={onOpenNewTripModal}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-dark transition-colors flex items-center gap-1 shadow-sm"
            title="建立新旅程"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">新旅程</span>
          </button>

          {/* Cloud Sync Status Indicator */}
          <div 
            className="flex items-center" 
            title={isFirebaseConnected ? 'Firebase 即時同步中 (資料上傳秒級更新)' : 'Local-First 本機存儲模式 (支援離線)'}
          >
            {isFirebaseConnected ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px]">
                <Cloud className="w-3 h-3" />
                <span className="hidden md:inline">即時同步</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-surface-dark border border-surface-border text-ink-muted text-[10px]">
                <FolderSync className="w-3 h-3" />
                <span className="hidden md:inline">本機快取</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

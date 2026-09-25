import React from 'react';
import { 
  CalendarDays, 
  ReceiptText, 
  ScanLine, 
  Scale, 
  SlidersHorizontal 
} from 'lucide-react';

export type ActiveTab = 'itinerary' | 'expenses' | 'scanner' | 'settlement' | 'settings';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  expenseCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  expenseCount,
}) => {
  const navItems = [
    {
      id: 'itinerary' as ActiveTab,
      label: '行程',
      icon: CalendarDays,
    },
    {
      id: 'expenses' as ActiveTab,
      label: '記帳',
      icon: ReceiptText,
      badge: expenseCount > 0 ? expenseCount : undefined,
    },
    {
      id: 'scanner' as ActiveTab,
      label: '掃描翻譯',
      icon: ScanLine,
    },
    {
      id: 'settlement' as ActiveTab,
      label: '結算',
      icon: Scale,
    },
    {
      id: 'settings' as ActiveTab,
      label: '設定',
      icon: SlidersHorizontal,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-surface-border safe-area-pb">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 ${
                isActive 
                  ? 'text-primary font-bold' 
                  : 'text-ink-muted hover:text-ink font-medium'
              }`}
            >
              <div className="relative">
                <Icon 
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.25]' : 'stroke-[1.75]'
                  }`} 
                />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-terracotta text-white text-[9px] font-bold flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

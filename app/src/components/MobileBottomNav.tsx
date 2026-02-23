import { MessageSquare, Users, Settings, Hash, Home } from 'lucide-react';
import type { ViewMode } from './ChatLayout';

interface MobileBottomNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  unreadDMCount?: number;
}

export function MobileBottomNav({ 
  currentView, 
  onViewChange,
  unreadDMCount = 0 
}: MobileBottomNavProps) {
  const navItems = [
    { id: 'server' as const, icon: Home, label: 'Server' },
    { id: 'channels' as const, icon: Hash, label: 'Channels' },
    { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
    { id: 'friends' as const, icon: Users, label: 'Friends', badge: unreadDMCount },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-14 bg-[#202225] border-t border-[#36393f] flex items-center justify-around px-2 z-50 safe-area-bottom">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full relative ${
              isActive ? 'text-[#5865f2]' : 'text-[#b9bbbe]'
            }`}
          >
            <div className="relative">
              <Icon className="w-6 h-6" />
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[#ed4245] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{item.label}</span>
            {isActive && (
              <div className="absolute top-0 w-8 h-0.5 bg-[#5865f2] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}

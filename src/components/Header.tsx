import React from 'react';
import { Sprout } from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import { ThemeToggleButton } from './ThemeToggleButton';

interface HeaderProps {
  userRole: UserRole;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenEditProfile?: () => void;
  onNotificationClick?: () => void;
  onOpenPriceWatch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userRole,
  currentUser,
  onLogout,
  onOpenEditProfile,
  onNotificationClick,
  onOpenPriceWatch,
}) => {
  const roleLabel =
    userRole === 'admin' ? 'Admin' : userRole === 'farmer' ? 'Farmer' : 'Buyer';

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-emerald-100 px-3.5 py-2.5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-700/20 text-white flex-shrink-0">
            <Sprout className="w-5 h-5" />
          </div>
          <h1 className="hidden min-[400px]:block text-base font-bold tracking-tight text-emerald-950 font-display whitespace-nowrap">
            Veggie<span className="text-emerald-600">Connect</span>
          </h1>
        </div>

        {/* Compact controls: theme + DA prices */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Per-role dark mode toggle — saved separately for this account's role */}
          <ThemeToggleButton id="btn-theme-toggle" />

          {onOpenPriceWatch && (
            <button
              id="btn-header-da-prices"
              onClick={onOpenPriceWatch}
              className="w-8 h-8 min-h-[32px] rounded-full bg-emerald-100/90 hover:bg-emerald-200/90 border border-emerald-300/80 flex items-center justify-center text-emerald-900 transition-colors cursor-pointer active:scale-95 flex-shrink-0"
              title="DA Bantay Presyo daily price watch"
              aria-label="DA Bantay Presyo daily price watch"
            >
              <Sprout className="w-4 h-4 text-emerald-700" />
            </button>
          )}

          {currentUser && (
            <span
              className="min-h-[32px] px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 flex-shrink-0"
              title={`${currentUser.name} · ${roleLabel}`}
            >
              <span className="truncate max-w-[70px]">{currentUser.name.split(' ')[0]}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

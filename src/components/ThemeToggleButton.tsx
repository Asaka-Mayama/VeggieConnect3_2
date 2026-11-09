import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { toggleThemeMode, useThemeMode } from '../utils/themeStore';

interface ThemeToggleButtonProps {
  id?: string;
  /**
   * Visual context of where the button sits:
   * - 'light': on light surfaces (headers, cards)
   * - 'dark': on dark green banners (admin console header, splash screen)
   */
  tone?: 'light' | 'dark';
  className?: string;
}

/**
 * Round dark-mode toggle. Stores the preference per role, so each user
 * (admin / farmer / buyer / transporter) has an independent theme.
 */
export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  id,
  tone = 'light',
  className = '',
}) => {
  const mode = useThemeMode();
  const isDark = mode === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      id={id}
      onClick={toggleThemeMode}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      className={`vc-theme-btn vc-theme-btn-${tone} ${className}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};

import { useSyncExternalStore } from 'react';

/**
 * Per-role dark mode store.
 *
 * Every role (admin / farmer / buyer / transporter / guest) keeps its OWN
 * theme preference in localStorage, so toggling dark mode as the admin
 * never changes what farmers or buyers see on their own accounts — and
 * switching accounts instantly restores that account's saved theme.
 *
 * The active mode is applied as a `vc-dark` class on <html>, which a
 * stylesheet uses to repaint the whole app (see src/index.css).
 */
export type ThemeMode = 'light' | 'dark';

const STORAGE_PREFIX = 'veggieconnect_v9_clean_theme_';
const DARK_CLASS = 'vc-dark';

let activeRole = 'guest';
let mode: ThemeMode = 'light';
let hydrated = false;
const listeners = new Set<() => void>();

function readSavedMode(role: string): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + role) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyToDom(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(DARK_CLASS, mode === 'dark');
  document.documentElement.style.colorScheme = mode === 'dark' ? 'dark' : 'light';
}

function emit(): void {
  listeners.forEach((cb) => cb());
}

/**
 * Switch the theme scope to a role and load that role's saved preference.
 * Called on app boot and whenever the logged-in role changes.
 */
export function setThemeRole(role: string | null | undefined): void {
  const next = role || 'guest';
  const changed = next !== activeRole || !hydrated;
  activeRole = next;
  hydrated = true;
  if (changed) {
    mode = readSavedMode(activeRole);
    applyToDom();
    emit();
  }
}

export function getThemeMode(): ThemeMode {
  return mode;
}

export function getThemeRole(): string {
  return activeRole;
}

export function subscribeTheme(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Toggle dark/light for the CURRENT role only.
 * Other roles' saved preferences are never touched.
 */
export function toggleThemeMode(): void {
  mode = mode === 'dark' ? 'light' : 'dark';
  try {
    window.localStorage.setItem(STORAGE_PREFIX + activeRole, mode);
  } catch {
    /* storage unavailable (private mode) — theme applies for this session only */
  }
  applyToDom();
  emit();
}

/** React hook: the active role's current theme mode. */
export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribeTheme, getThemeMode, () => 'light' as ThemeMode);
}

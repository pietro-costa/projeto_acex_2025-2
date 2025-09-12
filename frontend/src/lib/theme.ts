export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

export function getStoredTheme(): Theme | null {
  try { return (localStorage.getItem(STORAGE_KEY) as Theme) || null; } catch { return null; }
}

export function setStoredTheme(t: Theme) {
  try { localStorage.setItem(STORAGE_KEY, t); } catch {}
}

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark());
  root.classList.toggle('dark', isDark);
}

export function initTheme() {
   document.documentElement.classList.add('dark');
}

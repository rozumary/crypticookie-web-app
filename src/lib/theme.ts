import { useState, useEffect } from 'react';

export type AppTheme = 'purple-poster' | 'midnight-slate';

const THEME_STORAGE_KEY = 'crypticookie_app_theme';

export function useAppTheme() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'midnight-slate' || saved === 'purple-poster') {
        return saved;
      }
    } catch (e) {}
    // Default to the requested Cyber Purple Poster theme!
    return 'purple-poster';
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {}

    const root = document.documentElement;
    if (theme === 'purple-poster') {
      root.classList.add('theme-purple-poster');
      root.classList.remove('theme-midnight-slate');
      document.body.className = 'bg-[#0b051e] text-[#f5f3ff] font-sans antialiased selection:bg-purple-500 selection:text-white min-h-screen';
    } else {
      root.classList.add('theme-midnight-slate');
      root.classList.remove('theme-purple-poster');
      document.body.className = 'bg-[#060a17] text-[#f1f5f9] font-sans antialiased selection:bg-violet-600 selection:text-white min-h-screen';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'purple-poster' ? 'midnight-slate' : 'purple-poster'));
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    isPurple: theme === 'purple-poster',
  };
}

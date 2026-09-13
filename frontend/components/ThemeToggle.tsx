'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="w-24 h-9 rounded-lg bg-muted border border-border animate-pulse"
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 xl:px-3 rounded-lg text-xs font-semibold
                 bg-card hover:bg-muted text-foreground border border-border shadow-sm
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                 transition-all active:scale-95 select-none cursor-pointer shrink-0"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Current: ${theme} mode. Click to toggle.`}
    >
      {isDark ? (
        <>
          <Moon className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
          <span className="hidden xl:inline">Dark</span>
        </>
      ) : (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
          <span className="hidden xl:inline">Light</span>
        </>
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}

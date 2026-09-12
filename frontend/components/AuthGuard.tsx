'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUIStore, isAuthorizedEmail } from '../store/useUIStore';
import { CigaretteIcon } from './CigaretteIcon';
import { ShieldCheck, Lock } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Strict AuthGuard Component (PR-013)
 * Protects all routes except /login.
 * Redirects unauthenticated users immediately to /login.
 * Prevents any flash of unauthenticated store content.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoginPage = pathname === '/login';
  const isAuthenticated = Boolean(currentUser && isAuthorizedEmail(currentUser.email));

  useEffect(() => {
    if (!mounted) return;

    if (!isLoginPage && !isAuthenticated) {
      router.replace('/login');
    }
  }, [mounted, isLoginPage, isAuthenticated, router]);

  // If on login page, render children (the login page itself)
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Before client hydration completes or if not authenticated, shield content with accessible security banner
  if (!mounted || !isAuthenticated) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground"
      >
        <div className="w-full max-w-sm p-8 rounded-3xl border border-border bg-card shadow-2xl flex flex-col items-center text-center space-y-5 animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <CigaretteIcon className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-black tracking-tight text-foreground flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <span>Authentication Required</span>
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Verifying authorized session. Redirecting to secure login...
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-2 border-t border-border w-full justify-center">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Retail Sales Protected Workspace</span>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated with valid session: render protected layout & content
  return <>{children}</>;
}

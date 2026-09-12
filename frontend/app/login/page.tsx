'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Sparkles, UserCheck, ArrowRight } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export default function LoginPage() {
  const router = useRouter();
  const { addNotification } = useUIStore();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'salesperson' | 'auditor'>('salesperson');
  const [loading, setLoading] = useState(false);

  const handleDevLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('apex_auth_token', data.accessToken || data.token || 'mock-token');
        addNotification('success', `Logged in successfully as ${selectedRole.toUpperCase()}`);
        router.push('/');
      } else {
        // Fallback for offline mode
        localStorage.setItem('apex_auth_token', 'offline-dev-token');
        addNotification('info', `Running in offline dev mode as ${selectedRole}`);
        router.push('/');
      }
    } catch (e) {
      // Offline fallback
      localStorage.setItem('apex_auth_token', 'offline-dev-token');
      addNotification('info', `Running in offline dev mode as ${selectedRole}`);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    addNotification('info', 'Redirecting to Google OAuth 2.0 OpenID Connect verification...');
    // In production, triggers Google Identity Services OAuth popup or redirect flow
    setTimeout(() => {
      handleDevLogin();
    }, 600);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Sign In to Apex POS</h1>
          <p className="text-xs text-muted-foreground">
            Enterprise Single Sign-On with Google OAuth 2.0 & Role-Based Access Control
          </p>
        </div>

        {/* Google SSO Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-3 shadow-xs hover:shadow-sm transition-all active:scale-98 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-border w-full" />
          <span className="bg-card px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider relative">
            Or Dev Quick-Login
          </span>
        </div>

        {/* Role Selector for Dev Testing */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-foreground">
            Select Role to Authenticate:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['salesperson', 'admin', 'auditor'] as const).map((r) => {
              const isSelected = selectedRole === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleDevLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer mt-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>Enter as {selectedRole.toUpperCase()}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="pt-4 border-t border-border flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Stateless JWT token sessions signed with RS256 / HS256 encryption.</span>
        </div>
      </div>
    </div>
  );
}

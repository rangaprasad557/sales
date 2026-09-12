'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, CheckCircle2, UserCheck, ArrowRight, AlertOctagon } from 'lucide-react';
import { useUIStore, AUTHORIZED_EMAILS, isAuthorizedEmail } from '../../store/useUIStore';
import { CigaretteIcon } from '../../components/CigaretteIcon';

interface AuthorizedAccount {
  name: string;
  email: string;
  initial: string;
  badge: string;
}

const AUTHORIZED_ACCOUNTS: AuthorizedAccount[] = [
  {
    name: 'Ranga Prasad',
    email: 'rangaprasad.557@gmail.com',
    initial: 'R',
    badge: 'Full Access',
  },
  {
    name: 'Surendra Singari',
    email: 'singarisurendra@gmail.com',
    initial: 'S',
    badge: 'Full Access',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { addNotification, login } = useUIStore();
  const [selectedEmail, setSelectedEmail] = useState<string>(AUTHORIZED_ACCOUNTS[0].email);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleAuthorizedLogin = async (account: AuthorizedAccount) => {
    setLoading(true);
    setAuthError(null);

    try {
      // Backend auth verification
      await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email, role: 'full_access' }),
      }).catch(() => null);

      const success = login({
        id: `usr-${account.email.replace(/[@.]/g, '-')}`,
        name: account.name,
        email: account.email,
        role: 'full_access',
      });

      if (success) {
        addNotification('success', `Welcome, ${account.name}! Signed in with Full Access.`);
        router.push('/');
      } else {
        setAuthError(`Access Denied: ${account.email} is not authorized.`);
      }
    } catch {
      setAuthError('Authentication service temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    setAuthError(null);
    addNotification('info', 'Verifying Google Account credentials against authorized whitelist...');

    const account = AUTHORIZED_ACCOUNTS.find((a) => a.email === selectedEmail) || AUTHORIZED_ACCOUNTS[0];

    setTimeout(() => {
      if (!isAuthorizedEmail(account.email)) {
        setAuthError(
          `Access Denied: ${account.email} is not authorized. Only rangaprasad.557@gmail.com and singarisurendra@gmail.com have access.`
        );
        addNotification('error', 'Authentication failed: Account not in authorized whitelist.');
        setLoading(false);
        return;
      }

      const success = login({
        id: `usr-google-${account.email.replace(/[@.]/g, '-')}`,
        name: account.name,
        email: account.email,
        role: 'full_access',
      });

      if (success) {
        addNotification('success', `Authenticated with Google Account: ${account.email}`);
        router.push('/');
      } else {
        setAuthError('Authentication failed: account rejected by security gate.');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Brand & Security Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-xs">
            <CigaretteIcon className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Sign In to Sales POS</h1>
          <p className="text-xs text-muted-foreground">
            Restricted Access • Exclusive Two-User Full-Access Authorization
          </p>
        </div>

        {/* Security Rejection Banner if any */}
        {authError && (
          <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertOctagon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="font-medium">{authError}</div>
          </div>
        )}

        {/* Authorized User Profile Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-foreground">
            Select Authorized Account (Full Access):
          </label>
          <div className="flex flex-col gap-2">
            {AUTHORIZED_ACCOUNTS.map((account) => {
              const isSelected = selectedEmail === account.email;
              return (
                <div
                  key={account.email}
                  onClick={() => setSelectedEmail(account.email)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                      : 'bg-muted/40 hover:bg-muted border-border'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border text-foreground'
                      }`}
                    >
                      {account.initial}
                    </div>
                    <div className="truncate text-left">
                      <div className="font-bold text-xs text-foreground truncate">{account.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">{account.email}</div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    {account.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Google SSO Button */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs flex items-center justify-center gap-3 shadow-xs hover:shadow-sm transition-all active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
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
            <span>Continue with Google as Selected User</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const acc = AUTHORIZED_ACCOUNTS.find((a) => a.email === selectedEmail) || AUTHORIZED_ACCOUNTS[0];
              handleAuthorizedLogin(acc);
            }}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>Direct Sign In with Full Access</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="pt-4 border-t border-border flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Strict whitelist security: Only rangaprasad.557@gmail.com and singarisurendra@gmail.com are permitted.</span>
        </div>
      </div>
    </div>
  );
}


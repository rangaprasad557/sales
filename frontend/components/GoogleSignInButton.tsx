'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { AlertCircle } from 'lucide-react';

interface GoogleSignInButtonProps {
  clientId: string;
  onSuccess: (credential: string) => void;
  onError: (errorMessage: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({
  clientId,
  onSuccess,
  onError,
  disabled = false,
}: GoogleSignInButtonProps) {
  const btnContainerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google script is already loaded
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    // Dynamically load Google Identity Services SDK
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setScriptLoaded(true));
      existingScript.addEventListener('error', () => setLoadError('Failed to load Google Identity Services SDK.'));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setLoadError('Failed to connect to Google Identity Services. Check your internet connection.');
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !clientId || !btnContainerRef.current || !window.google?.accounts?.id) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (response?.credential) {
            onSuccess(response.credential);
          } else {
            onError('Google Sign-In failed: No credential returned.');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Clear previous button renderings
      btnContainerRef.current.innerHTML = '';

      window.google.accounts.id.renderButton(btnContainerRef.current, {
        theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        type: 'standard',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
        width: 320,
      });
    } catch (err: any) {
      onError(err?.message || 'Failed to initialize Google Sign-In button.');
    }
  }, [scriptLoaded, clientId, resolvedTheme, onSuccess, onError]);

  if (loadError) {
    return (
      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{loadError}</span>
      </div>
    );
  }

  return (
    <div
      className={`w-full flex flex-col items-center justify-center min-h-[44px] transition-opacity ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <div
        ref={btnContainerRef}
        id="google-signin-btn-container"
        className="flex items-center justify-center min-h-[44px]"
        aria-label="Sign in with Google"
      />
    </div>
  );
}

import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export const AUTHORIZED_EMAILS = [
  'rangaprasad.557@gmail.com',
  'singarisurendra@gmail.com',
] as const;

export function isAuthorizedEmail(email: string): boolean {
  if (!email) return false;
  return AUTHORIZED_EMAILS.includes(email.toLowerCase().trim() as any);
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'full_access' | string;
  avatar?: string;
}

interface UIState {
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;
  notifications: AppNotification[];
  addNotification: (type: AppNotification['type'], message: string) => void;
  removeNotification: (id: string) => void;
  currentUser: UserSession | null;
  login: (user: UserSession) => boolean;
  logout: () => void;
}

// Helper to get stored user on client (purges any unauthorized legacy session)
function getStoredUser(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('apex_user_session');
    if (!raw) return null;
    const user: UserSession = JSON.parse(raw);
    if (!user || !isAuthorizedEmail(user.email)) {
      localStorage.removeItem('apex_user_session');
      localStorage.removeItem('apex_auth_token');
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export const useUIStore = create<UIState>((set) => ({
  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  isMobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  activeNavTab: 'sales',
  setActiveNavTab: (tab) => set({ activeNavTab: tab }),
  notifications: [],
  addNotification: (type, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      notifications: [...state.notifications, { id, type, message }],
    }));
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 4000);
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  currentUser: getStoredUser(),
  login: (user: UserSession): boolean => {
    const email = user.email.toLowerCase().trim();
    if (!isAuthorizedEmail(email)) {
      return false;
    }
    const authorizedUser: UserSession = {
      ...user,
      email,
      role: 'full_access',
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('apex_user_session', JSON.stringify(authorizedUser));
      localStorage.setItem('apex_auth_token', `jwt-full-access-${Date.now()}`);
    }
    set({ currentUser: authorizedUser });
    return true;
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('apex_user_session');
      localStorage.removeItem('apex_auth_token');
    }
    set({ currentUser: null });
  },
}));


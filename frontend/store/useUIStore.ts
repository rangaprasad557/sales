import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
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
}));

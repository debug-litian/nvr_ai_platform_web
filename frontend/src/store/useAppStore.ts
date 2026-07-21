import { create } from 'zustand';
import type { AppModule } from '../types/menu';

const COLLAPSED_KEY = 'clarity_sidebar_collapsed';
const MODULE_KEY = 'clarity_active_module';
const HOME_OPEN_KEYS = 'clarity_home_open_keys';
const DEVICE_OPEN_KEYS = 'clarity_device_open_keys';

interface AppState {
  collapsed: boolean;
  activeModule: AppModule;
  homeOpenKeys: string[];
  deviceOpenKeys: string[];
  backendOnline: boolean;

  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;
  setActiveModule: (m: AppModule) => void;
  setHomeOpenKeys: (keys: string[]) => void;
  setDeviceOpenKeys: (keys: string[]) => void;
  setBackendOnline: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  collapsed: localStorage.getItem(COLLAPSED_KEY) === 'true',
  activeModule: (localStorage.getItem(MODULE_KEY) as AppModule) || 'home',
  homeOpenKeys: JSON.parse(localStorage.getItem(HOME_OPEN_KEYS) || '[]'),
  deviceOpenKeys: JSON.parse(localStorage.getItem(DEVICE_OPEN_KEYS) || '[]'),
  backendOnline: false,

  toggleCollapsed: () =>
    set((s) => {
      const v = !s.collapsed;
      localStorage.setItem(COLLAPSED_KEY, String(v));
      return { collapsed: v };
    }),
  setCollapsed: (v) => {
    localStorage.setItem(COLLAPSED_KEY, String(v));
    set({ collapsed: v });
  },
  setActiveModule: (m) => {
    localStorage.setItem(MODULE_KEY, m);
    set({ activeModule: m });
  },
  setHomeOpenKeys: (keys) => {
    localStorage.setItem(HOME_OPEN_KEYS, JSON.stringify(keys));
    set({ homeOpenKeys: keys });
  },
  setDeviceOpenKeys: (keys) => {
    localStorage.setItem(DEVICE_OPEN_KEYS, JSON.stringify(keys));
    set({ deviceOpenKeys: keys });
  },
  setBackendOnline: (v) => set({ backendOnline: v }),
}));

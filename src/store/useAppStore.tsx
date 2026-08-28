import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage, StorageKeys } from '../utils/storage';

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  color?: string; // added color support
}

export interface AppSettings {
  autoplayPreview: boolean;
  reduceMotion: boolean;
  showProgress: boolean;
}

export interface AppState {
  profiles: Profile[];
  selectedProfile: Profile | null;
  favorites: string[]; // content IDs
  watchProgress: Record<string, number>; // contentId -> progress (0-1)
  settings: AppSettings;
  isAuthenticated: boolean;
  history: string[];
  storageVersion: number;
}

const defaultState: AppState = {
  profiles: [],
  selectedProfile: null,
  favorites: [],
  watchProgress: {},
  settings: {
    autoplayPreview: true,
    reduceMotion: false,
    showProgress: true,
  },
  history: [],
  isAuthenticated: false,
  storageVersion: 2,
};

export interface AppActions {
  setProfiles: (profiles: Profile[]) => void;
  setSelectedProfile: (profile: Profile | null) => void;
  toggleFavorite: (contentId: string) => void;
  setWatchProgress: (contentId: string, progress: number) => void;
  clearFavorites: () => void;
  clearWatchProgress: () => void;
  addToHistory: (contentId: string) => void;
  clearHistory: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetDemo: () => void;
  login: () => void;
  logout: () => void;
}

const AppStateContext = createContext<{
  state: AppState;
  actions: AppActions;
} | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AppState>(() => {
    // Check for V2 first
    const savedV2 = storage.get<AppState | null>(StorageKeys.APP_STATE, null);
    if (savedV2 && savedV2.storageVersion === 2) {
      return savedV2;
    }

    // Migration from V1
    const savedV1 = storage.get<any>(StorageKeys.V1_STATE, null);
    if (savedV1) {
      return {
        ...defaultState,
        profiles: savedV1.profiles || [],
        selectedProfile: savedV1.selectedProfile || null,
        favorites: savedV1.favorites || [],
        watchProgress: savedV1.watchProgress || {},
        storageVersion: 2,
      };
    }

    return defaultState;
  });

  useEffect(() => {
    storage.set(StorageKeys.APP_STATE, state);
  }, [state]);

  const actions: AppActions = {
    setProfiles: (profiles) => setState((s) => ({ ...s, profiles })),
    setSelectedProfile: (profile) => setState((s) => ({ ...s, selectedProfile: profile })),
    toggleFavorite: (contentId) =>
      setState((s) => ({
        ...s,
        favorites: s.favorites.includes(contentId)
          ? s.favorites.filter((id) => id !== contentId)
          : [...s.favorites, contentId],
      })),
    setWatchProgress: (contentId, progress) =>
      setState((s) => ({
        ...s,
        watchProgress: { ...s.watchProgress, [contentId]: progress },
      })),
    clearFavorites: () => setState((s) => ({ ...s, favorites: [] })),
    clearWatchProgress: () => setState((s) => ({ ...s, watchProgress: {} })),
    addToHistory: (contentId) => 
      setState((s) => ({
        ...s,
        history: [contentId, ...s.history.filter(id => id !== contentId)].slice(0, 50),
      })),
    clearHistory: () => setState((s) => ({ ...s, history: [] })),
    updateSettings: (settings) => setState((s) => ({ ...s, settings: { ...s.settings, ...settings } })),
    resetDemo: () => setState(defaultState),
    login: () => setState((s) => ({ ...s, isAuthenticated: true })),
    logout: () => {
      storage.remove('msplay_auth_token');
      storage.remove('msplay_auth_user');
      storage.remove('msplay_auth_v1');
      setState((s) => ({ ...s, isAuthenticated: false, selectedProfile: null, profiles: [] }));
    },
  };

  return (
    <AppStateContext.Provider value={{ state, actions }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppStateProvider');
  }
  return context;
};
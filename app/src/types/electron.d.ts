export interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

export interface AppVersion {
  version: string;
  isPackaged: boolean;
}

export interface ElectronAPI {
  // App info
  getAppVersion: () => Promise<AppVersion>;
  
  // Auto-update functions
  checkForUpdates: () => Promise<{ success: boolean; message?: string; updateInfo?: any }>;
  downloadUpdate: () => Promise<{ success: boolean; message?: string }>;
  installUpdate: () => void;
  onUpdateStatus: (callback: (data: UpdateStatus) => void) => () => void;
  
  // Window controls
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  
  // Platform
  platform: string;
  
  // Window state
  isFocused: () => Promise<boolean>;
  
  // Notifications
  showNotification: (options: { title: string; body: string; icon?: string }) => Promise<boolean>;
  focusWindow: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};

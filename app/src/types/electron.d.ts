export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  platform: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};

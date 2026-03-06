import { useCallback, useRef, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

interface UseNotificationOptions {
  enabled?: boolean;
  soundEnabled?: boolean;
  desktopEnabled?: boolean;
}

// Global audio element to avoid re-creation
let globalAudio: HTMLAudioElement | null = null;

function getAudio() {
  if (!globalAudio && typeof window !== 'undefined') {
    globalAudio = new Audio('/sounds/workgrid-notification.mp3');
    globalAudio.volume = 0.5;
    globalAudio.preload = 'auto';
  }
  return globalAudio;
}

export function useNotification(options: UseNotificationOptions = {}) {
  const { 
    enabled = true, 
    soundEnabled = true, 
    desktopEnabled = true 
  } = options;
  
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (e) {
      return false;
    }
  }, []);

  // Play sound
  const playSound = useCallback(async () => {
    if (!soundEnabled) return;
    
    const audio = getAudio();
    if (!audio) return;
    
    try {
      audio.currentTime = 0;
      await audio.play();
    } catch (err) {
      // Ignore audio errors
    }
  }, [soundEnabled]);

  // Main notify function
  const notify = useCallback(async ({
    title,
    body,
    icon,
    tag,
  }: {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
  }) => {
    if (!enabled) return;

    console.log('🔔 NOTIFICATION:', title, '-', body);

    // 1. Play sound
    if (soundEnabled) {
      await playSound();
    }

    // 2. Show toast (ALWAYS show toast for every message)
    toast(title, {
      description: body,
      duration: 4000,
      icon: '🔔',
    });

    // 3. Show desktop notification if permission granted
    // In Electron, use native notification API
    if (isElectron && window.electronAPI?.showNotification) {
      try {
        await window.electronAPI.showNotification({
          title,
          body,
          icon: icon || '/workgrid_app_icon.png',
        });
      } catch (e) {
        console.error('Electron notification error:', e);
      }
    } else if (desktopEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: icon || '/workgrid_app_icon.png',
          tag: tag || `notif-${Date.now()}-${Math.random()}`,
        });
      } catch (e) {
        console.error('Desktop notification error:', e);
      }
    }
  }, [enabled, soundEnabled, desktopEnabled, playSound]);

  return { 
    notify, 
    playSound, 
    permission,
    requestPermission 
  };
}

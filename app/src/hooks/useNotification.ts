import { useCallback, useRef, useEffect, useState } from 'react';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Path to notification sound
const NOTIFICATION_SOUND = '/sounds/workgrid-notification.mp3';

interface UseNotificationOptions {
  enabled?: boolean;
  soundEnabled?: boolean;
  desktopEnabled?: boolean;
}

export function useNotification(options: UseNotificationOptions = {}) {
  const { 
    enabled = true, 
    soundEnabled = true, 
    desktopEnabled = true 
  } = options;
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(NOTIFICATION_SOUND);
      audioRef.current.volume = 0.5;
      audioRef.current.load();
    }
  }, []);

  // Request notification permission on first user interaction
  useEffect(() => {
    const initNotifications = async () => {
      if (!enabled) return;
      
      // Initialize audio on first interaction
      if (audioRef.current && !isInitialized) {
        try {
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsInitialized(true);
        } catch (e) {
          // Audio will be initialized on next interaction
        }
      }
      
      // Request notification permission
      if (desktopEnabled && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          setHasPermission(true);
        } else if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          setHasPermission(permission === 'granted');
        }
      }
    };

    // Listen for first user interaction
    window.addEventListener('click', initNotifications, { once: true });
    window.addEventListener('keydown', initNotifications, { once: true });

    return () => {
      window.removeEventListener('click', initNotifications);
      window.removeEventListener('keydown', initNotifications);
    };
  }, [enabled, desktopEnabled, isInitialized]);

  const playSound = useCallback(async () => {
    if (!soundEnabled || !audioRef.current) return;
    
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (err) {
      console.log('Audio play failed:', err);
    }
  }, [soundEnabled]);

  const notify = useCallback(async ({
    title,
    body,
    icon,
    silent = false,
    tag,
  }: {
    title: string;
    body: string;
    icon?: string;
    silent?: boolean;
    tag?: string;
  }) => {
    if (!enabled) return;

    console.log('🔔 Notify called:', { title, body, soundEnabled, silent });

    // Always play sound if enabled (even in browser)
    if (soundEnabled && !silent) {
      await playSound();
    }

    // Show desktop notification
    if (desktopEnabled && 'Notification' in window) {
      // Check if we should show notification
      let shouldShow = false;
      
      if (isElectron) {
        // Electron: check if window is focused
        try {
          const electronAPI = (window as any).electronAPI;
          const isFocused = await electronAPI?.isFocused?.();
          shouldShow = !isFocused;
          console.log('Electron focused:', isFocused, 'Should show:', shouldShow);
        } catch (e) {
          shouldShow = true;
        }
      } else {
        // Browser: check document visibility
        shouldShow = document.visibilityState === 'hidden';
        console.log('Browser visibility:', document.visibilityState, 'Should show:', shouldShow);
      }

      if (shouldShow && hasPermission) {
        try {
          new Notification(title, {
            body,
            icon: icon || '/workgrid_app_icon.png',
            tag: tag || 'workgrid-message',
            requireInteraction: false,
          });
          console.log('✅ Notification shown');
        } catch (e) {
          console.error('❌ Notification error:', e);
        }
      } else {
        console.log('Notification skipped:', { shouldShow, hasPermission });
      }
    }
  }, [enabled, soundEnabled, desktopEnabled, hasPermission, playSound]);

  return { notify, playSound, hasPermission, isInitialized };
}

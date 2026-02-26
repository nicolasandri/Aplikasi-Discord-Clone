import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface PushState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
}

export function usePush() {
  const [state, setState] = useState<PushState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default'
  });
  const { token } = useAuth();

  useEffect(() => {
    // Check if push is supported (not in Electron and has required APIs)
    if (!isElectron && 'serviceWorker' in navigator && 'PushManager' in window) {
      setState(prev => ({ ...prev, isSupported: true }));
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setState(prev => ({
        ...prev,
        isSubscribed: !!subscription,
        permission: Notification.permission
      }));
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const subscribe = useCallback(async () => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission: permissionResult }));
      
      if (permissionResult !== 'granted') {
        return { success: false, error: 'Notification permission denied' };
      }

      // Get VAPID public key from server
      const response = await fetch(`${API_URL}/push/vapid-public-key`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Failed to get VAPID key' };
      }
      
      const { publicKey } = await response.json();
      
      if (!publicKey) {
        return { success: false, error: 'Push notifications not configured on server' };
      }

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      const subscribeResponse = await fetch(`${API_URL}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subscription)
      });

      if (!subscribeResponse.ok) {
        throw new Error('Failed to save subscription on server');
      }

      setState(prev => ({ ...prev, isSubscribed: true }));
      return { success: true };
    } catch (error) {
      console.error('Subscribe error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [token]);

  const unsubscribe = useCallback(async () => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Tell server to remove subscription
        await fetch(`${API_URL}/push/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
      }
      
      setState(prev => ({ ...prev, isSubscribed: false }));
      return { success: true };
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [token]);

  const testNotification = useCallback(async () => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${API_URL}/push/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Failed to send test notification' };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Test notification error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [token]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    testNotification
  };
}

// Helper function to convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as BufferSource;
}

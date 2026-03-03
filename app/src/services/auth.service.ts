import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  displayName?: string;
  status: string;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
}

interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private deviceId: string;
  private tokenExpiryTime: number | null = null;
  private refreshCallbacks: (() => void)[] = [];

  constructor() {
    // Generate atau ambil device ID dari localStorage
    this.deviceId = localStorage.getItem('deviceId') || this.generateDeviceId();
    localStorage.setItem('deviceId', this.deviceId);
    
    // Setup token refresh interval
    this.setupTokenRefreshInterval();
  }

  private generateDeviceId(): string {
    return 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private setupTokenRefreshInterval() {
    // Check token expiry setiap 1 menit
    setInterval(() => {
      if (this.accessToken && this.isExpiringSoon()) {
        this.refreshAccessToken().catch(() => {
          // Silent fail, akan dihandle oleh interceptor
        });
      }
    }, 60000);
  }

  setAccessToken(token: string, expiresIn: number) {
    this.accessToken = token;
    this.tokenExpiryTime = Date.now() + (expiresIn * 1000);
    
    // Notify subscribers
    this.refreshCallbacks.forEach(callback => callback());
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  onTokenRefresh(callback: () => void) {
    this.refreshCallbacks.push(callback);
    return () => {
      this.refreshCallbacks = this.refreshCallbacks.filter(cb => cb !== callback);
    };
  }

  // Check if token is expiring within 5 minutes
  private isExpiringSoon(): boolean {
    if (!this.tokenExpiryTime) return true;
    return Date.now() > this.tokenExpiryTime - 5 * 60 * 1000; // 5 menit buffer
  }

  // Get valid access token (auto-refresh if needed)
  async getValidAccessToken(): Promise<string | null> {
    console.log('[AuthService] getValidAccessToken called');
    
    // Kalau ada access token dan belum expired, return langsung
    if (this.accessToken && !this.isExpiringSoon()) {
      console.log('[AuthService] Using existing valid token');
      return this.accessToken;
    }

    console.log('[AuthService] Token expired or missing, trying to refresh...');
    // Kalau tidak ada access token atau sudah expired, coba refresh
    return this.refreshAccessToken();
  }

  // Refresh access token
  private async refreshAccessToken(): Promise<string | null> {
    console.log('[AuthService] refreshAccessToken called');
    
    if (this.refreshPromise) {
      console.log('[AuthService] Refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<string | null> {
    console.log('[AuthService] doRefresh called');
    
    try {
      // Ambil userId dari stored user kalau access token tidak ada
      let userId = null;
      if (this.accessToken) {
        try {
          const decoded = JSON.parse(atob(this.accessToken.split('.')[1]));
          userId = decoded.userId;
          console.log('[AuthService] Got userId from access token:', userId);
        } catch (e) {
          console.log('[AuthService] Failed to decode access token');
        }
      }
      
      // Kalau tidak bisa decode, ambil dari localStorage
      if (!userId) {
        const storedUser = this.getStoredUser();
        userId = storedUser?.id;
        console.log('[AuthService] Got userId from localStorage:', userId);
      }
      
      if (!userId) {
        console.log('[AuthService] No userId found, cannot refresh');
        return null;
      }
      
      // Coba ambil refresh token dari localStorage (fallback)
      const fallbackRefreshToken = localStorage.getItem('refreshToken');
      console.log('[AuthService] Fallback refresh token exists:', !!fallbackRefreshToken);
      
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.accessToken ? `Bearer ${this.accessToken}` : ''
        },
        body: JSON.stringify({ 
          deviceId: this.deviceId,
          userId: userId,
          refreshToken: fallbackRefreshToken // Kirim sebagai fallback
        }),
        credentials: 'include' // Include cookies untuk refresh token
      });

      console.log('[AuthService] Refresh response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('[AuthService] Refresh failed:', error);
        
        // Kalau token revoked, clear semua data
        if (error.code === 'TOKEN_REVOKED') {
          this.clearAuth();
          window.location.href = '/login?reason=session_ended';
          throw new Error('Sesi telah berakhir');
        }
        
        throw new Error(error.error || 'Refresh failed');
      }

      const data: RefreshResponse = await response.json();
      console.log('[AuthService] Refresh successful, new token received');
      this.setAccessToken(data.accessToken, data.expiresIn);

      // Update user di localStorage
      localStorage.setItem('user', JSON.stringify(data.user));

      return data.accessToken;
    } catch (error) {
      console.error('[AuthService] Token refresh error:', error);
      this.clearAuth();
      
      // Redirect ke login kalau bukan karena TOKEN_REVOKED (sudah dihandle di atas)
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = '/login?reason=session_expired';
      }
      
      return null;
    }
  }

  // Setup axios interceptors
  setupAxiosInterceptors(axiosInstance: AxiosInstance) {
    // Request interceptor
    axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await this.getValidAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        if (
          error.response?.status === 401 &&
          (error.response?.data as any)?.code === 'TOKEN_EXPIRED' &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          const newToken = await this.refreshAccessToken();

          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosInstance(originalRequest);
          }
        }

        // Token revoked (force logout)
        if (
          error.response?.status === 401 &&
          (error.response?.data as any)?.code === 'TOKEN_REVOKED'
        ) {
          this.clearAuth();
          alert('Sesi Anda telah berakhir. Silakan login kembali.');
          window.location.href = '/login?reason=session_ended';
        }

        return Promise.reject(error);
      }
    );
  }

  // Login
  async login(email: string, password: string, rememberMe: boolean = false): Promise<LoginResponse> {
    console.log('[AuthService] Login called');
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        deviceId: this.deviceId,
        rememberMe
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login gagal');
    }

    const data: LoginResponse = await response.json();
    console.log('[AuthService] Login successful');
    this.setAccessToken(data.accessToken, data.expiresIn);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  }

  // Register
  async register(username: string, email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        deviceId: this.deviceId
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registrasi gagal');
    }

    const data: LoginResponse = await response.json();
    this.setAccessToken(data.accessToken, data.expiresIn);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deviceId: this.deviceId }),
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  // Force logout all devices
  async logoutAll(): Promise<void> {
    const response = await fetch(`${API_URL}/auth/logout-all`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Gagal logout dari semua perangkat');
    }

    this.clearAuth();
  }

  // Get active sessions
  async getSessions(): Promise<any[]> {
    const response = await fetch(`${API_URL}/auth/sessions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Gagal mengambil daftar sesi');
    }

    return response.json();
  }

  // Clear all auth data
  clearAuth() {
    this.accessToken = null;
    this.tokenExpiryTime = null;
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Get stored user
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const authService = new AuthService();
export type { User, LoginResponse, RefreshResponse };

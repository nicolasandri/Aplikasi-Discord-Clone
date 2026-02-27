import { useState } from 'react';
import { usePush } from '../hooks/usePush';
import { Bell, BellOff, Check, AlertCircle, Send, Info } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export function NotificationSettings() {
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe, testNotification, error: pushError } = usePush();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleSubscribe = async () => {
    setLoading(true);
    setMessage(null);
    const result = await subscribe();
    setLoading(false);
    
    if (result.success) {
      setMessage('Notifikasi push berhasil diaktifkan!');
    } else {
      setMessage(result.error || 'Gagal mengaktifkan notifikasi');
    }
    
    setTimeout(() => setMessage(null), 5000);
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setMessage(null);
    const result = await unsubscribe();
    setLoading(false);
    
    if (result.success) {
      setMessage('Notifikasi push berhasil dimatikan');
    } else {
      setMessage(result.error || 'Gagal mematikan notifikasi');
    }
    
    setTimeout(() => setMessage(null), 5000);
  };

  const handleTest = async () => {
    setTestLoading(true);
    const result = await testNotification();
    setTestLoading(false);
    
    if (result.success) {
      setMessage('Notifikasi tes terkirim! Periksa notifikasi Anda.');
    } else {
      setMessage(result.error || 'Gagal mengirim notifikasi tes');
    }
    
    setTimeout(() => setMessage(null), 5000);
  };

  if (!isSupported) {
    return (
      <div className={`bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-3 ${isMobile ? 'p-3' : 'p-4'}`}>
        <AlertCircle className={`text-yellow-500 flex-shrink-0 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
        <p className={`text-yellow-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          Notifikasi push tidak didukung di browser ini atau sedang berjalan di aplikasi desktop.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isMobile ? 'pb-4' : ''}`}>
      {/* Main Card */}
      <div className={`bg-[#2f3136] rounded-lg border border-[#202225] ${isMobile ? 'p-3' : 'p-4'}`}>
        <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'}`}>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Bell className={`text-[#5865F2] ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <h3 className={`font-medium text-white ${isMobile ? 'text-sm' : 'text-base'}`}>Notifikasi Push</h3>
            </div>
            <p className={`text-gray-400 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Dapatkan notifikasi ketika seseorang menyebut Anda atau mengirim DM
            </p>
          </div>
          
          {isSubscribed ? (
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className={`flex items-center justify-center gap-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isMobile ? 'w-full px-3 py-2 text-sm' : 'px-4 py-2'}`}
            >
              {loading ? (
                <span className={`border-2 border-red-400 border-t-transparent rounded-full animate-spin ${isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} />
              ) : (
                <BellOff className={`${isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} />
              )}
              Matikan
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading || permission === 'denied'}
              className={`flex items-center justify-center gap-2 bg-[#5865F2] text-white rounded hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isMobile ? 'w-full px-3 py-2 text-sm' : 'px-4 py-2'}`}
            >
              {loading ? (
                <span className={`border-2 border-white border-t-transparent rounded-full animate-spin ${isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} />
              ) : (
                <Bell className={`${isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} />
              )}
              Aktifkan
            </button>
          )}
        </div>
      </div>

      {/* Permission Denied */}
      {permission === 'denied' && (
        <div className={`bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 ${isMobile ? 'p-3' : 'p-3'}`}>
          <AlertCircle className={`text-red-400 flex-shrink-0 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <p className={`text-red-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Notifikasi diblokir. Silakan aktifkan di pengaturan browser Anda.
          </p>
        </div>
      )}

      {/* Server Error */}
      {pushError && (
        <div className={`bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-3 ${isMobile ? 'p-3' : 'p-3'}`}>
          <Info className={`text-yellow-400 flex-shrink-0 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <p className={`text-yellow-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Push notification belum dikonfigurasi di server.
          </p>
        </div>
      )}

      {/* Subscribed Status */}
      {isSubscribed && (
        <div className={`bg-[#2f3136] rounded-lg border border-[#202225] ${isMobile ? 'p-3' : 'p-4'}`}>
          <div className={`flex items-center ${isMobile ? 'flex-col gap-3' : 'justify-between'}`}>
            <div className="flex items-center gap-2 text-green-400">
              <Check className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <span className={`${isMobile ? 'text-sm' : 'text-sm'}`}>Notifikasi aktif</span>
            </div>
            
            <button
              onClick={handleTest}
              disabled={testLoading}
              className={`flex items-center gap-2 text-[#5865F2] hover:text-[#4752C4] disabled:opacity-50 transition-colors ${isMobile ? 'w-full justify-center px-3 py-2 bg-[#5865F2]/10 rounded text-sm' : ''}`}
            >
              {testLoading ? (
                <span className={`border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin ${isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} />
              ) : (
                <Send className={`${isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} />
              )}
              Kirim notifikasi tes
            </button>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`rounded-lg ${
          message.includes('berhasil') || message.includes('terkirim')
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        } ${isMobile ? 'p-3 text-sm' : 'p-3 text-sm'}`}>
          {message}
        </div>
      )}
    </div>
  );
}

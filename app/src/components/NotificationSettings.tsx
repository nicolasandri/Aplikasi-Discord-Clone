import { useState } from 'react';
import { usePush } from '../hooks/usePush';
import { Bell, BellOff, Check, AlertCircle, Send } from 'lucide-react';

export function NotificationSettings() {
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe, testNotification } = usePush();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
        <p className="text-sm text-yellow-200">
          Notifikasi push tidak didukung di browser ini atau sedang berjalan di aplikasi desktop.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-white">Notifikasi Push</h3>
          <p className="text-sm text-gray-400">
            Dapatkan notifikasi ketika seseorang menyebut Anda atau mengirim DM
          </p>
        </div>
        
        {isSubscribed ? (
          <button
            onClick={handleUnsubscribe}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
            Matikan
          </button>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={loading || permission === 'denied'}
            className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white rounded hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            Aktifkan
          </button>
        )}
      </div>

      {permission === 'denied' && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">
            Notifikasi diblokir. Silakan aktifkan di pengaturan browser Anda.
          </p>
        </div>
      )}

      {isSubscribed && (
        <div className="flex items-center gap-4 pt-2 border-t border-[#202225]">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <Check className="w-4 h-4" />
            <span>Notifikasi aktif</span>
          </div>
          
          <button
            onClick={handleTest}
            disabled={testLoading}
            className="flex items-center gap-2 text-sm text-[#5865F2] hover:text-[#4752C4] disabled:opacity-50 transition-colors"
          >
            {testLoading ? (
              <span className="w-4 h-4 border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Kirim notifikasi tes
          </button>
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.includes('berhasil') || message.includes('terkirim')
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}

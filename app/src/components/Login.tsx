import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface LoginProps {
  onToggleForm: () => void;
}

export function Login({ onToggleForm }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch {
      // Error handled in context
    }
  };

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4">
      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-10 w-24 h-24 bg-white/10 rounded-full blur-lg animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="w-full max-w-4xl bg-[#36393f] rounded-lg shadow-2xl overflow-hidden relative z-10">
        <div className="flex flex-col md:flex-row">
          {/* Login Form */}
          <div className="flex-1 p-8 md:p-12">
            <div className="flex items-center gap-3 mb-8">
              <img 
                src="/workgrid_logo_main.png" 
                alt="WorkGrid" 
                className="w-12 h-12 rounded-xl object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = '<div class="w-12 h-12 bg-[#5865f2] rounded-xl flex items-center justify-center"><span class="text-white text-xl font-bold">W</span></div>';
                }}
              />
              <h1 className="text-2xl font-bold text-white">WorkGrid</h1>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Selamat Datang Kembali!</h2>
              <p className="text-[#b9bbbe]">Senang melihat Anda lagi!</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#b9bbbe] text-sm font-medium uppercase tracking-wide">
                  Email <span className="text-[#ed4245]">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#202225] border-[#040405] text-white placeholder:text-[#72767d] focus:border-[#5865f2] focus:ring-[#5865f2]/20 h-12"
                  placeholder="nama@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#b9bbbe] text-sm font-medium uppercase tracking-wide">
                  Password <span className="text-[#ed4245]">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#202225] border-[#040405] text-white placeholder:text-[#72767d] focus:border-[#5865f2] focus:ring-[#5865f2]/20 h-12"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="text-[#ed4245] text-sm">{error}</div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium text-base transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Masuk'
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button type="button" className="text-[#00a8fc] hover:underline">
                  Lupa password?
                </button>
              </div>

              <div className="text-[#72767d] text-sm">
                Perlu akun baru?{' '}
                <button
                  type="button"
                  onClick={onToggleForm}
                  className="text-[#00a8fc] hover:underline"
                >
                  Daftar
                </button>
              </div>
            </form>
          </div>

          {/* QR Code Section */}
          <div className="hidden md:flex flex-col items-center justify-center bg-[#2f3136] p-12 w-80">
            <div className="bg-white p-4 rounded-lg mb-6">
              <QRCodeSVG
                value="https://chatcord.app"
                size={160}
                level="M"
                includeMargin={false}
              />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Login dengan QR</h3>
            <p className="text-[#b9bbbe] text-center text-sm">
              Pindai kode ini dengan aplikasi WorkGrid mobile untuk login instan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

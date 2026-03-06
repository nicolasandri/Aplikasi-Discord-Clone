import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, User, HelpCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

interface RegisterProps {
  onToggleForm?: () => void;
}

export function Register({ onToggleForm }: RegisterProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { register, loading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to home when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleToggleForm = () => {
    if (onToggleForm) {
      onToggleForm();
    } else {
      navigate('/login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    
    if (password !== confirmPassword) {
      setPasswordError('Password tidak cocok');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password minimal 6 karakter');
      return;
    }

    try {
      await register(username, email, password);
      // Navigation handled by useEffect above
    } catch {
      // Error handled in context
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col relative overflow-hidden"
      style={{
        backgroundImage: 'url("/bg workgrid.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-8 py-4">
        <button 
          onClick={handleToggleForm}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Kembali ke Login</span>
        </button>
        <div className="flex items-center gap-6">
          <button className="text-gray-300 hover:text-white text-sm flex items-center gap-1 transition-colors">
            <HelpCircle className="w-4 h-4" />
            Support
          </button>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-gray-300">System status</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md bg-[#1a1b2e]/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10">
          <div className="p-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <img 
                src="./workgrid-logos/logo-192.png" 
                alt="WorkGrid" 
                className="w-10 h-10 rounded-xl object-contain"
              />
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Buat Akun</h2>
              <p className="text-gray-400">Bergabung dengan tim Anda di WorkGrid</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300 text-xs font-medium uppercase tracking-wider">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-[#0f0f1a] border-[#2a2b3d] text-white placeholder:text-gray-600 focus:border-[#00d4ff] focus:ring-[#00d4ff]/20 h-12 pl-12 rounded-xl"
                    placeholder="johndoe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300 text-xs font-medium uppercase tracking-wider">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-[#0f0f1a] border-[#2a2b3d] text-white placeholder:text-gray-600 focus:border-[#00d4ff] focus:ring-[#00d4ff]/20 h-12 pl-12 rounded-xl"
                    placeholder="nama@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300 text-xs font-medium uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[#0f0f1a] border-[#2a2b3d] text-white placeholder:text-gray-600 focus:border-[#00d4ff] focus:ring-[#00d4ff]/20 h-12 pl-12 rounded-xl"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300 text-xs font-medium uppercase tracking-wider">
                  Konfirmasi Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-[#0f0f1a] border-[#2a2b3d] text-white placeholder:text-gray-600 focus:border-[#00d4ff] focus:ring-[#00d4ff]/20 h-12 pl-12 rounded-xl"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {(error || passwordError) && (
                <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                  {error || passwordError}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#00d4ff] hover:bg-[#00b8db] text-black font-semibold text-base transition-all rounded-xl shadow-lg shadow-[#00d4ff]/25 hover:shadow-[#00d4ff]/40"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Daftar'
                )}
              </Button>

              <div className="text-center text-gray-400 text-sm">
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={handleToggleForm}
                  className="text-[#00d4ff] hover:text-[#00b8db] transition-colors font-medium"
                >
                  Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

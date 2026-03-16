import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedNavbar, ModernHero, FeatureShowcase } from '@/components/sections';
import { MagneticButton } from '@/components/animations';

interface ModernLoginProps {
  onToggleForm?: () => void;
}

export function ModernLogin({ onToggleForm }: ModernLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { login, loading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err: any) {
      if (err?.code === 'FORCE_PASSWORD_CHANGE') {
        navigate('/force-change-password', { replace: true });
      }
    }
  };

  return (
    <div className="w-full bg-[#050608]">
      {/* Navbar */}
      <AnimatedNavbar />

      {/* Hero Section */}
      <ModernHero />

      {/* Features Section */}
      <FeatureShowcase />

      {/* Login Modal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isModalOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
          isModalOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        onClick={() => setIsModalOpen(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: isModalOpen ? 1 : 0.9, opacity: isModalOpen ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-[#0a0c10] rounded-2xl border border-cyan-500/20 shadow-2xl p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white mb-2">Masuk</h2>
            <p className="text-gray-400">Masukkan kredensial Anda untuk melanjutkan</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 text-xs font-medium uppercase">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#15192a] border-cyan-500/20 text-white placeholder:text-gray-600 focus:border-cyan-500 focus:ring-cyan-500/20 h-12 pl-12 rounded-lg"
                  placeholder="nama@email.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 text-xs font-medium uppercase">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#15192a] border-cyan-500/20 text-white placeholder:text-gray-600 focus:border-cyan-500 focus:ring-cyan-500/20 h-12 pl-12 pr-12 rounded-lg"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <MagneticButton
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-black font-semibold text-base rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Masuk'
              )}
            </MagneticButton>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#0a0c10] text-gray-500">atau</span>
              </div>
            </div>

            {/* Register Link */}
            <p className="text-gray-400 text-center text-sm">
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
              >
                Daftar sekarang
              </button>
            </p>
          </form>
        </motion.div>
      </motion.div>

      {/* Floating Login Button */}
      <motion.div
        className="fixed bottom-8 right-8 z-40"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        <MagneticButton
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#050608] font-bold rounded-full shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all"
        >
          Masuk Sekarang
        </MagneticButton>
      </motion.div>
    </div>
  );
}

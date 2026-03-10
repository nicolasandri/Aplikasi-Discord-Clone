import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap } from 'lucide-react';
import { MagneticButton } from './MagneticButton';

const navLinks = [
  { label: 'Fitur', href: '#features' },
  { label: 'Harga', href: '#pricing' },
  { label: 'Tentang', href: '#about' },
  { label: 'Dokumentasi', href: '#docs' },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-[#050608]/90 backdrop-blur-xl border-b border-cyan-500/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <motion.a
              href="/"
              className="flex items-center gap-2 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center"
                whileHover={{ rotate: 10 }}
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(0, 255, 255, 0.3)',
                    '0 0 30px rgba(0, 255, 255, 0.5)',
                    '0 0 20px rgba(0, 255, 255, 0.3)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-6 h-6 text-[#050608]" />
              </motion.div>
              <span className="text-xl font-bold text-white">
                Work<span className="text-cyan-400">Grid</span>
              </span>
            </motion.a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link, index) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative text-gray-300 hover:text-white transition-colors text-sm font-medium group"
                >
                  {link.label}
                  <motion.span
                    className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-400 group-hover:w-full transition-all duration-300"
                  />
                </motion.a>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
                onClick={() => window.location.href = '/login'}
              >
                Masuk
              </motion.button>
              <MagneticButton
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#050608] font-semibold text-sm rounded-lg btn-shine"
                onClick={() => window.location.href = '/login'}
              >
                Daftar Gratis
              </MagneticButton>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              className="md:hidden text-white p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-16 z-40 md:hidden"
          >
            <div className="bg-[#050608]/95 backdrop-blur-xl border-b border-cyan-500/20 mx-4 rounded-2xl overflow-hidden">
              <div className="px-4 py-6 space-y-4">
                {navLinks.map((link, index) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="block text-gray-300 hover:text-cyan-400 transition-colors py-2 text-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </motion.a>
                ))}
                <div className="pt-4 space-y-3 border-t border-white/10">
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="w-full py-3 border border-cyan-500/50 text-cyan-400 rounded-xl hover:bg-cyan-500/10 transition-colors"
                    onClick={() => window.location.href = '/login'}
                  >
                    Masuk
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#050608] font-semibold rounded-xl"
                    onClick={() => window.location.href = '/login'}
                  >
                    Daftar Gratis
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

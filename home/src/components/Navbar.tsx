import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, Zap } from 'lucide-react';

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

  const navLinks = [
    { label: 'Fitur', href: '#features' },
    { label: 'Harga', href: '#pricing' },
    { label: 'Tentang', href: '#about' },
    { label: 'Dokumentasi', href: '#docs' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#0f1218]/90 backdrop-blur-xl border-b border-cyan-500/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center glow-cyan group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-[#0f1218]" />
            </div>
            <span className="text-xl font-bold text-white">
              Work<span className="text-cyan-400">Grid</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-gray-300 hover:text-cyan-400 transition-colors text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-gray-300 hover:text-white hover:bg-white/10"
              onClick={() => window.location.href = 'https://workgrid.homeku.net/login'}
            >
              Masuk
            </Button>
            <Button
              className="bg-cyan-500 hover:bg-cyan-400 text-[#0f1218] font-semibold px-6 btn-glow"
              onClick={() => window.location.href = 'https://workgrid.homeku.net/login'}
            >
              Daftar Gratis
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#0f1218]/95 backdrop-blur-xl border-b border-cyan-500/20">
          <div className="px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-gray-300 hover:text-cyan-400 transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 space-y-3">
              <Button
                variant="outline"
                className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                onClick={() => window.location.href = 'https://workgrid.homeku.net/login'}
              >
                Masuk
              </Button>
              <Button
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-[#0f1218] font-semibold"
                onClick={() => window.location.href = 'https://workgrid.homeku.net/login'}
              >
                Daftar Gratis
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

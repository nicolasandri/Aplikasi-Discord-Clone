import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Sparkles, Users, MessageSquare, Mic } from 'lucide-react';

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const x = (clientX / innerWidth - 0.5) * 20;
      const y = (clientY / innerHeight - 0.5) * 20;
      
      const img = heroRef.current.querySelector('.hero-image') as HTMLElement;
      if (img) {
        img.style.transform = `translate(${x}px, ${y}px)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0c10]"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute inset-0 bg-noise" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-400/15 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[150px]" />

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/40 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pt-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-6">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 text-sm font-medium">Platform Kolaborasi Modern</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-tight mb-6">
              KOMUNIKASI{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 text-glow">
                TANPA BATAS
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0">
              WorkGrid adalah platform komunikasi tim yang powerful. Chat, voice call, dan kolaborasi dalam satu tempat yang aman dan cepat.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Button
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-400 text-[#0f1218] font-bold text-lg px-8 py-6 btn-glow glow-cyan"
                onClick={() => window.location.href = 'https://workgrid.homeku.net/login'}
              >
                Mulai Gratis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-8 py-6 text-lg"
              >
                <Play className="w-5 h-5 mr-2" />
                Lihat Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">10K+</div>
                  <div className="text-sm text-gray-500">Pengguna Aktif</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">1M+</div>
                  <div className="text-sm text-gray-500">Pesan Terkirim</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Mic className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">50K+</div>
                  <div className="text-sm text-gray-500">Jam Voice Call</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative">
            <div className="relative hero-image transition-transform duration-300 ease-out">
              <img
                src="/hero-illustration.png"
                alt="WorkGrid Platform"
                className="w-full h-auto rounded-2xl"
              />
              
              {/* Glow Effect Behind Image */}
              <div className="absolute inset-0 -z-10 bg-cyan-500/30 rounded-2xl blur-3xl scale-90" />
            </div>

            {/* Floating Cards */}
            <div className="absolute -top-4 -right-4 glass rounded-xl p-4 animate-float">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
                <div>
                  <div className="text-white font-medium text-sm">Tim Online</div>
                  <div className="text-cyan-400 text-xs">24 anggota aktif</div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 glass rounded-xl p-4 animate-float" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 border-2 border-[#0a0c10]"
                    />
                  ))}
                </div>
                <div className="text-white text-sm font-medium">+120 lainnya</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0c10] to-transparent" />
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Mail, Lock, HelpCircle } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(bgRef.current, { opacity: 0, scale: 1.08 });
      gsap.set(cardRef.current, { opacity: 0, y: 24, scale: 0.985 });
      gsap.set(leftColRef.current?.children || [], { opacity: 0, y: 16 });
      gsap.set(rightColRef.current, { opacity: 0, x: 18 });
      gsap.set(topBarRef.current, { opacity: 0, y: -10 });

      // Entrance animation timeline
      const entranceTl = gsap.timeline({ delay: 0.2 });

      // Background fade in
      entranceTl.to(bgRef.current, {
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: 'power2.out'
      }, 0);

      // Top bar
      entranceTl.to(topBarRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out'
      }, 0.1);

      // Main card
      entranceTl.to(cardRef.current, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: 'power2.out'
      }, 0.2);

      // Left column content staggered reveal
      const leftChildren = leftColRef.current?.children;
      if (leftChildren) {
        entranceTl.to(leftChildren, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out'
        }, 0.35);
      }

      // Right column
      entranceTl.to(rightColRef.current, {
        opacity: 1,
        x: 0,
        duration: 0.7,
        ease: 'power2.out'
      }, 0.5);

      // Scroll-driven animations
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
          onLeaveBack: () => {
            // Reset all elements to visible when scrolling back to top
            gsap.to(bgRef.current, { opacity: 1, scale: 1, y: 0 });
            gsap.to(cardRef.current, { opacity: 1, y: 0, scale: 1 });
            gsap.to(leftColRef.current?.children || [], { opacity: 1, x: 0 });
            gsap.to(rightColRef.current, { opacity: 1, x: 0 });
            gsap.to(topBarRef.current, { opacity: 1 });
          }
        }
      });

      // Phase 1: ENTRANCE (0%-30%) - Hold visible state
      // Elements already visible from load animation

      // Phase 2: SETTLE (30%-70%) - Static, no animation

      // Phase 3: EXIT (70%-100%)
      scrollTl.fromTo(bgRef.current,
        { scale: 1, y: 0 },
        { scale: 1.06, y: '-2vh', ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(cardRef.current,
        { y: 0, scale: 1, opacity: 1 },
        { y: '-18vh', scale: 0.96, opacity: 0, ease: 'power2.in' },
        0.7
      );

      const leftChildrenArray = Array.from(leftColRef.current?.children || []);
      scrollTl.fromTo(leftChildrenArray,
        { x: 0, opacity: 1 },
        { x: '-10vw', opacity: 0.2, ease: 'power2.in', stagger: 0.02 },
        0.72
      );

      scrollTl.fromTo(rightColRef.current,
        { x: 0, opacity: 1 },
        { x: '10vw', opacity: 0.2, ease: 'power2.in' },
        0.72
      );

      scrollTl.fromTo(topBarRef.current,
        { opacity: 1 },
        { opacity: 0, ease: 'power2.in' },
        0.85
      );

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login attempt:', { email, password });
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-midnight">
      {/* Background Image */}
      <div 
        ref={bgRef}
        className="absolute inset-0 z-[1]"
      >
        <img 
          src="/bg_neon_street.jpg" 
          alt="Background" 
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(7,11,18,0.55)] to-[rgba(7,11,18,0.75)]" />
      </div>

      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Top Bar */}
      <div 
        ref={topBarRef}
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5 md:px-10"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan flex items-center justify-center">
            <span className="text-midnight font-heading font-bold text-sm">W</span>
          </div>
          <span className="text-text-primary font-heading font-semibold text-lg">WorkGrid</span>
        </div>
        
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-text-secondary hover:text-cyan transition-colors text-sm">
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Support</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-status status-pulse" />
            <span className="text-text-secondary text-sm hidden sm:inline">System status</span>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div 
        ref={cardRef}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[min(920px,92vw)] h-[min(560px,78vh)]"
      >
        <div className="w-full h-full glass glass-border rounded-[18px] shadow-card overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 h-full">
            
            {/* Left Column - Form */}
            <div 
              ref={leftColRef}
              className="flex flex-col justify-center p-6 md:p-10 lg:p-11"
            >
              {/* Logo Mark */}
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-cyan flex items-center justify-center">
                  <span className="text-midnight font-heading font-bold text-lg">W</span>
                </div>
              </div>

              {/* Heading */}
              <h1 className="text-text-primary font-heading font-semibold text-2xl md:text-[28px] leading-tight mb-2">
                Selamat Datang Kembali!
              </h1>
              <p className="text-text-secondary text-sm md:text-base mb-8">
                Senang melihat Anda lagi!
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label className="block text-text-secondary text-xs font-medium uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full bg-surface border border-surface-border rounded-xl py-3 pl-11 pr-4 text-text-primary text-sm placeholder:text-text-secondary/50 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-text-secondary text-xs font-medium uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface border border-surface-border rounded-xl py-3 pl-11 pr-4 text-text-primary text-sm placeholder:text-text-secondary/50 transition-all"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-cyan hover:bg-cyan-dark active:bg-cyan-darker text-midnight font-semibold py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Masuk
                </button>
              </form>

              {/* Links */}
              <div className="mt-6 space-y-3">
                <button className="text-cyan text-sm hover:underline transition-all">
                  Lupa password?
                </button>
                <p className="text-text-secondary text-sm">
                  Perlu akun baru?{' '}
                  <button className="text-cyan hover:underline transition-all">
                    Daftar
                  </button>
                </p>
              </div>
            </div>

            {/* Right Column - QR */}
            <div 
              ref={rightColRef}
              className="hidden md:flex flex-col items-center justify-center bg-surface p-10 relative"
            >
              {/* QR Code Container */}
              <div className="relative">
                <div className="w-44 h-44 bg-white rounded-xl p-3 flex items-center justify-center">
                  {/* QR Code SVG */}
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {/* QR Code Pattern - Simplified representation */}
                    <rect x="0" y="0" width="30" height="30" fill="#070B12"/>
                    <rect x="5" y="5" width="20" height="20" fill="white"/>
                    <rect x="10" y="10" width="10" height="10" fill="#070B12"/>
                    
                    <rect x="70" y="0" width="30" height="30" fill="#070B12"/>
                    <rect x="75" y="5" width="20" height="20" fill="white"/>
                    <rect x="80" y="10" width="10" height="10" fill="#070B12"/>
                    
                    <rect x="0" y="70" width="30" height="30" fill="#070B12"/>
                    <rect x="5" y="75" width="20" height="20" fill="white"/>
                    <rect x="10" y="80" width="10" height="10" fill="#070B12"/>
                    
                    {/* Data modules */}
                    <rect x="35" y="5" width="5" height="5" fill="#070B12"/>
                    <rect x="45" y="5" width="5" height="5" fill="#070B12"/>
                    <rect x="55" y="5" width="5" height="5" fill="#070B12"/>
                    
                    <rect x="35" y="15" width="5" height="5" fill="#070B12"/>
                    <rect x="50" y="15" width="5" height="5" fill="#070B12"/>
                    
                    <rect x="40" y="25" width="5" height="5" fill="#070B12"/>
                    <rect x="55" y="25" width="5" height="5" fill="#070B12"/>
                    
                    <rect x="5" y="35" width="5" height="5" fill="#070B12"/>
                    <rect x="15" y="35" width="5" height="5" fill="#070B12"/>
                    <rect x="25" y="35" width="5" height="5" fill="#070B12"/>
                    
                    <rect x="35" y="35" width="30" height="30" fill="#070B12"/>
                    <rect x="40" y="40" width="20" height="20" fill="white"/>
                    <rect x="45" y="45" width="10" height="10" fill="#070B12"/>
                    
                    <rect x="70" y="35" width="5" height="5" fill="#070B12"/>
                    <rect x="80" y="35" width="5" height="5" fill="#070B12"/>
                    <rect x="90" y="35" width="5" height="5" fill="#070B12"/>
                    
                    <rect x="5" y="45" width="5" height="5" fill="#070B12"/>
                    <rect x="20" y="45" width="5" height="5" fill="#070B12"/>
                    
                    <rect x="5" y="55" width="5" height="5" fill="#070B12"/>
                    <rect x="15" y="55" width="5" height="5" fill="#070B12"/>
                    <rect x="25" y="55" width="5" height="5" fill="#070B12"/>
                    
                    <rect x="70" y="45" width="5" height="5" fill="#070B12"/>
                    <rect x="85" y="45" width="5" height="5" fill="#070B12"/>
                    
                    <rect x="75" y="55" width="5" height="5" fill="#070B12"/>
                    <rect x="90" y="55" width="5" height="5" fill="#070B12"/>
                    
                    <rect x="35" y="70" width="5" height="5" fill="#070B12"/>
                    <rect x="50" y="70" width="5" height="5" fill="#070B12"/>
                    <rect x="60" y="70" width="5" height="5" fill="#070B12"/>
                    
                    <rect x="40" y="80" width="5" height="5" fill="#070B12"/>
                    <rect x="55" y="80" width="5" height="5" fill="#070B12"/>
                    
                    <rect x="35" y="90" width="5" height="5" fill="#070B12"/>
                    <rect x="45" y="90" width="5" height="5" fill="#070B12"/>
                    <rect x="55" y="90" width="5" height="5" fill="#070B12"/>
                    
                    <rect x="70" y="70" width="30" height="30" fill="#070B12"/>
                    <rect x="75" y="75" width="20" height="20" fill="white"/>
                    <rect x="80" y="80" width="10" height="10" fill="#070B12"/>
                  </svg>
                </div>
                
                {/* Scan Line */}
                <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                  <div className="scan-line absolute left-0 right-0 h-0.5 bg-cyan shadow-[0_0_10px_rgba(46,233,255,0.8)]" style={{ top: '10px' }} />
                </div>
              </div>

              {/* Caption */}
              <h3 className="text-text-primary font-heading font-semibold text-lg mt-6">
                Login dengan QR
              </h3>
              <p className="text-text-secondary text-sm text-center mt-2 max-w-[240px]">
                Pindai kode ini dengan aplikasi WorkGrid mobile untuk login instan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile QR Section (visible only on small screens) */}
      <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <button className="flex items-center gap-2 text-cyan text-sm bg-surface/80 backdrop-blur-sm px-4 py-2 rounded-full border border-surface-border">
          <span>Login dengan QR</span>
        </button>
      </div>
    </div>
  );
}

export default App;

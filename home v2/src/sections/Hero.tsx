import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Play, Users, MessageSquare, Mic, Sparkles } from 'lucide-react';
import { TextScramble } from '@/components/TextScramble';
import { GlitchText } from '@/components/GlitchText';
import { MagneticButton } from '@/components/MagneticButton';
import { AnimatedCounter } from '@/components/AnimatedCounter';

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 255, 255, 0.3) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 153, 255, 0.25) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
          animate={{
            x: [0, -40, 0],
            y: [0, 40, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 255, 200, 0.15) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      
      {/* Scanline effect */}
      <div className="absolute inset-0 scanline pointer-events-none" />

      <motion.div 
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pt-32"
        style={{ y, opacity }}
      >
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Badge with animation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 group cursor-pointer hover:bg-white/10 transition-colors"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </motion.div>
              <span className="text-cyan-400 text-sm font-medium font-mono">
                <TextScramble text="Platform Kolaborasi Modern" delay={500} />
              </span>
            </motion.div>

            {/* Main Headline with Glitch */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-none mb-2">
                <span className="text-white">KOMUNIKASI</span>
              </h1>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-none mb-6">
                <GlitchText 
                  text="TANPA BATAS" 
                  className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 text-glow-strong"
                />
              </h1>
            </motion.div>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-lg sm:text-xl text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              WorkGrid adalah platform komunikasi tim yang{' '}
              <span className="text-cyan-400 font-semibold">powerful</span>. Chat, voice call, 
              dan kolaborasi dalam satu tempat yang aman dan cepat.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
            >
              <MagneticButton
                className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#050608] font-bold text-lg rounded-xl btn-shine glow-cyan overflow-hidden"
                onClick={() => window.location.href = 'https://workgrid.homeku.net/login'}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Mulai Gratis
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </span>
              </MagneticButton>
              
              <MagneticButton
                className="group px-8 py-4 glass text-cyan-400 font-semibold text-lg rounded-xl hover:bg-cyan-500/10 transition-all border border-cyan-500/30"
              >
                <span className="flex items-center justify-center gap-2">
                  <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Lihat Demo
                </span>
              </MagneticButton>
            </motion.div>

            {/* Stats with animated counters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="flex flex-wrap justify-center lg:justify-start gap-8"
            >
              {[
                { icon: Users, value: 10000, suffix: '+', label: 'Pengguna Aktif' },
                { icon: MessageSquare, value: 1000000, suffix: '+', label: 'Pesan Terkirim' },
                { icon: Mic, value: 50000, suffix: '+', label: 'Jam Voice Call' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="flex items-center gap-3 group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center group-hover:from-cyan-500/30 group-hover:to-cyan-600/20 transition-all">
                    <stat.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Content - Hero Image with effects */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.3, type: 'spring' }}
            className="relative perspective-1000"
          >
            {/* Floating orbs around image */}
            <motion.div
              className="absolute -top-8 -right-8 w-16 h-16 rounded-full bg-cyan-500/30 blur-xl"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-8 -left-8 w-20 h-20 rounded-full bg-cyan-400/20 blur-xl"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            />

            {/* Main image container */}
            <motion.div
              className="relative group"
              whileHover={{ scale: 1.02, rotateY: 5 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {/* Glow behind image */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-cyan-500/40 to-cyan-400/40 rounded-3xl blur-3xl scale-90 group-hover:scale-100 transition-transform duration-500" />
              
              {/* Image border gradient */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              
              <img
                src="/hero-illustration.png"
                alt="WorkGrid Platform"
                className="relative w-full h-auto rounded-3xl"
              />

              {/* Shimmer overlay */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
            </motion.div>

            {/* Floating status card */}
            <motion.div
              className="absolute -top-4 -right-4 glass rounded-xl p-4 border border-cyan-500/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-3 h-3 rounded-full bg-green-500"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div>
                  <div className="text-white font-medium text-sm">Tim Online</div>
                  <div className="text-cyan-400 text-xs font-mono">24 anggota aktif</div>
                </div>
              </div>
            </motion.div>

            {/* Floating users card */}
            <motion.div
              className="absolute -bottom-4 -left-4 glass rounded-xl p-4 border border-cyan-500/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 border-2 border-[#0a0c10]"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.5 + i * 0.1 }}
                    />
                  ))}
                </div>
                <span className="text-white text-sm font-medium">+120 lainnya</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#050608] to-transparent" />
    </section>
  );
}

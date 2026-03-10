import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Sparkles, Check } from 'lucide-react';
import { MagneticButton } from '../components/MagneticButton';

const benefits = [
  'Tidak perlu kartu kredit',
  'Setup dalam 2 menit',
  'Bisa dibatalkan kapan saja',
];

export function CTA() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[#050608]">
        {/* Gradient orbs */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 255, 255, 0.15) 0%, transparent 60%)',
            filter: 'blur(80px)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid opacity-20" />

        {/* Animated lines */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"
              style={{
                top: `${20 + i * 15}%`,
                left: 0,
                right: 0,
              }}
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 8 + i * 2,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 0.5,
              }}
            />
          ))}
        </div>
      </div>

      {/* Border animations */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, #00ffff, transparent)',
        }}
        animate={{
          opacity: [0.3, 1, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, #00ffff, transparent)',
        }}
        animate={{
          opacity: [0.3, 1, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 20, -20, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </motion.div>
          <span className="text-cyan-400 text-sm font-medium font-mono">Gratis Selamanya</span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6"
        >
          Siap Untuk{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 text-glow">
            Transformasi
          </span>
          <br />
          Tim Anda?
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-gray-400 text-lg max-w-2xl mx-auto mb-10"
        >
          Bergabung dengan ribuan tim yang sudah menggunakan WorkGrid untuk meningkatkan produktivitas dan komunikasi mereka.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-10"
        >
          <MagneticButton
            className="group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#050608] font-bold text-lg rounded-xl btn-shine glow-cyan-strong overflow-hidden"
            onClick={() => window.location.href = '/login'}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Daftar Sekarang - Gratis
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-5 h-5" />
              </motion.span>
            </span>
          </MagneticButton>

          <MagneticButton
            className="px-10 py-5 glass text-cyan-400 font-semibold text-lg rounded-xl hover:bg-cyan-500/10 transition-all border border-cyan-500/30"
            onClick={() => window.location.href = '/login'}
          >
            Masuk ke Aplikasi
          </MagneticButton>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-wrap justify-center gap-6"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.9 + index * 0.1 }}
              className="flex items-center gap-2 text-sm text-gray-500"
            >
              <motion.div
                className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center"
                whileHover={{ scale: 1.2 }}
              >
                <Check className="w-3 h-3 text-green-500" />
              </motion.div>
              {benefit}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { MessageSquare, Mic, FolderOpen, Shield, Zap, Globe, Sparkles, ChevronRight } from 'lucide-react';
import { TiltCard } from '@/components/TiltCard';
import { Spotlight } from '@/components/Spotlight';

const mainFeatures = [
  {
    icon: MessageSquare,
    title: 'Chat Real-time',
    description: 'Kirim pesan teks, gambar, dan file dengan cepat. Notifikasi instan dan history chat yang tersimpan aman.',
    image: '/feature-chat.png',
    color: 'from-cyan-400 to-cyan-600',
    features: ['Real-time sync', 'Notifikasi instan', 'History lengkap'],
  },
  {
    icon: Mic,
    title: 'Voice & Video Call',
    description: 'Komunikasi suara dan video berkualitas tinggi dengan noise cancellation. Support hingga 50 partisipan.',
    image: '/feature-voice.png',
    color: 'from-cyan-500 to-cyan-700',
    features: ['HD Quality', 'Noise cancellation', 'Screen sharing'],
  },
  {
    icon: FolderOpen,
    title: 'File Sharing',
    description: 'Bagikan file dengan mudah. Support dokumen, gambar, video hingga 100MB per file.',
    image: '/feature-collab.png',
    color: 'from-cyan-400 to-cyan-600',
    features: ['Drag & drop', '100MB limit', 'Cloud storage'],
  },
];

const additionalFeatures = [
  { icon: Shield, title: 'Keamanan Tinggi', description: 'Enkripsi end-to-end untuk semua pesan dan panggilan.' },
  { icon: Zap, title: 'Performa Cepat', description: 'Responsif dan ringan, bahkan pada koneksi lambat.' },
  { icon: Globe, title: 'Akses Dimana Saja', description: 'Tersedia di web, desktop, dan mobile. Sinkronisasi real-time.' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

export function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section id="features" ref={sectionRef} className="relative py-32 bg-[#050608]">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      
      {/* Floating orbs */}
      <motion.div
        className="absolute top-1/4 right-0 w-[300px] h-[300px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0, 255, 255, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, -30, 0],
          y: [0, 20, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium font-mono">Fitur Unggulan</span>
          </motion.div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            Semua yang Anda Butuhkan{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 text-glow">
              Dalam Satu Platform
            </span>
          </h2>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            WorkGrid menyediakan semua tools komunikasi yang dibutuhkan tim Anda untuk bekerja lebih efisien.
          </p>
        </motion.div>

        {/* Main Features */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="space-y-32"
        >
          {mainFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className={`grid lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              {/* Content */}
              <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} mb-6 shadow-lg shadow-cyan-500/30`}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </motion.div>

                <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  {feature.title}
                </h3>

                <p className="text-gray-400 text-lg leading-relaxed mb-6">
                  {feature.description}
                </p>

                <ul className="space-y-3">
                  {feature.features.map((item, i) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-3 text-gray-300 group cursor-pointer"
                    >
                      <motion.div
                        className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/40 transition-colors"
                        whileHover={{ scale: 1.2 }}
                      >
                        <ChevronRight className="w-3 h-3 text-cyan-400" />
                      </motion.div>
                      <span className="group-hover:text-cyan-400 transition-colors">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Image with 3D tilt */}
              <div className={`${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <TiltCard className="group">
                  <div className="relative">
                    {/* Animated border */}
                    <motion.div
                      className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 opacity-50 blur-sm"
                      animate={{
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                      }}
                      transition={{ duration: 5, repeat: Infinity }}
                      style={{ backgroundSize: '200% 200%' }}
                    />
                    
                    <div className="relative overflow-hidden rounded-2xl">
                      <motion.img
                        src={feature.image}
                        alt={feature.title}
                        className="w-full h-auto"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.5 }}
                      />
                      
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050608]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  </div>
                </TiltCard>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mt-32"
        >
          <h3 className="text-2xl font-bold text-white text-center mb-12">
            Dan Masih Banyak Lagi
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, index) => (
              <Spotlight key={feature.title}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -10 }}
                  className="glass rounded-2xl p-6 border border-white/5 hover:border-cyan-500/30 transition-all duration-300 group h-full"
                >
                  <motion.div
                    className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center mb-4 group-hover:from-cyan-500/30 group-hover:to-cyan-600/20 transition-all"
                    whileHover={{ rotate: 10, scale: 1.1 }}
                  >
                    <feature.icon className="w-7 h-7 text-cyan-400" />
                  </motion.div>
                  <h4 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                    {feature.title}
                  </h4>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              </Spotlight>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

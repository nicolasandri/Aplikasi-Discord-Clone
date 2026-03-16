import { motion } from 'framer-motion';
import { MessageSquare, Users, Shield, Zap, Lock, Globe } from 'lucide-react';
import { TiltCard } from '@/components/animations';

const features = [
  {
    icon: MessageSquare,
    title: 'Chat Real-time',
    description: 'Berkomunikasi instan dengan tim Anda. Dukungan emoji, file, dan mentions.',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    icon: Users,
    title: 'Kolaborasi Tim',
    description: 'Organisir tim dengan roles, channels, dan permissions yang fleksibel.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Zap,
    title: 'Voice & Video',
    description: 'HD voice calls dan video conferencing untuk komunikasi yang lebih personal.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Shield,
    title: 'Keamanan Tingkat Enterprise',
    description: 'End-to-end encryption dan compliance dengan standar internasional.',
    color: 'from-green-500 to-cyan-500',
  },
  {
    icon: Lock,
    title: 'Private & Secure',
    description: 'Data Anda tetap aman dengan enkripsi dan kontrol akses yang ketat.',
    color: 'from-red-500 to-pink-500',
  },
  {
    icon: Globe,
    title: 'Cloud Scalable',
    description: 'Infrastructure cloud yang dapat menangani jutaan pengguna simultan.',
    color: 'from-indigo-500 to-blue-500',
  },
];

export function FeatureShowcase() {
  return (
    <section id="features" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#050608] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Fitur <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300">Powerful</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Semua tools yang Anda butuhkan untuk komunikasi tim yang efisien dan aman
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <TiltCard className="group h-full">
                <div className="relative h-full p-8 rounded-2xl bg-gradient-to-br from-[#0a0c10] to-[#15192a] border border-cyan-500/10 group-hover:border-cyan-500/30 transition-colors overflow-hidden">
                  {/* Background gradient */}
                  <div
                    className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br ${feature.color}`}
                  />

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <motion.div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                      whileHover={{ rotate: 10 }}
                    >
                      <feature.icon className="w-7 h-7 text-white" />
                    </motion.div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-400 leading-relaxed mb-4">{feature.description}</p>

                    {/* Learn more link */}
                    <motion.a
                      href="#"
                      className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium"
                      whileHover={{ x: 5 }}
                    >
                      Pelajari lebih lanjut
                      <span>→</span>
                    </motion.a>
                  </div>

                  {/* Border glow */}
                  <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-cyan-500/50 transition-colors duration-300 pointer-events-none" />
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => (window.location.href = '/login')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#050608] font-bold text-lg rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
          >
            Mulai Gratis Sekarang
            <span>→</span>
          </motion.button>
        </motion.div>
      </div>

      {/* Background decoration */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
    </section>
  );
}

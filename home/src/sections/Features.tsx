import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Mic, FolderOpen, Shield, Zap, Globe } from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Chat Real-time',
    description: 'Kirim pesan teks, gambar, dan file dengan cepat. Notifikasi instan dan history chat yang tersimpan aman.',
    image: '/feature-chat.png',
    color: 'from-cyan-400 to-cyan-600',
  },
  {
    icon: Mic,
    title: 'Voice & Video Call',
    description: 'Komunikasi suara dan video berkualitas tinggi dengan noise cancellation. Support hingga 50 partisipan.',
    image: '/feature-voice.png',
    color: 'from-cyan-500 to-cyan-700',
  },
  {
    icon: FolderOpen,
    title: 'File Sharing',
    description: 'Bagikan file dengan mudah. Support dokumen, gambar, video hingga 100MB per file.',
    image: '/feature-collab.png',
    color: 'from-cyan-400 to-cyan-600',
  },
];

const additionalFeatures = [
  {
    icon: Shield,
    title: 'Keamanan Tinggi',
    description: 'Enkripsi end-to-end untuk semua pesan dan panggilan.',
  },
  {
    icon: Zap,
    title: 'Performa Cepat',
    description: 'Responsif dan ringan, bahkan pada koneksi lambat.',
  },
  {
    icon: Globe,
    title: 'Akses Dimana Saja',
    description: 'Tersedia di web, desktop, dan mobile. Sinkronisasi real-time.',
  },
];

export function Features() {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute('data-index'));
          if (entry.isIntersecting) {
            setVisibleItems((prev) => new Set([...prev, index]));
          }
        });
      },
      { threshold: 0.2, rootMargin: '-50px' }
    );

    itemRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="relative py-24 bg-[#0a0c10]">
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-50" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-6">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium">Fitur Unggulan</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
            Semua yang Anda Butuhkan{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-600">
              Dalam Satu Platform
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            WorkGrid menyediakan semua tools komunikasi yang dibutuhkan tim Anda untuk bekerja lebih efisien.
          </p>
        </div>

        {/* Main Features */}
        <div className="space-y-24">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              ref={(el) => { itemRefs.current[index] = el; }}
              data-index={index}
              className={`grid lg:grid-cols-2 gap-12 items-center transition-all duration-700 ${
                visibleItems.has(index)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-12'
              }`}
            >
              {/* Content */}
              <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} mb-6`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-lg leading-relaxed mb-6">
                  {feature.description}
                </p>
                <ul className="space-y-3">
                  {['Real-time synchronization', 'Notifikasi instan', 'History lengkap'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-gray-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image */}
              <div className={`relative ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <div className="relative group">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-auto rounded-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${feature.color} opacity-30 rounded-2xl blur-2xl scale-95 group-hover:scale-100 transition-transform`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Features Grid */}
        <div className="mt-32">
          <h3 className="text-2xl font-bold text-white text-center mb-12">
            Dan Masih Banyak Lagi
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, index) => (
              <div
                key={feature.title}
                ref={(el) => { itemRefs.current[index + 3] = el; }}
                data-index={index + 3}
                className={`glass rounded-2xl p-6 transition-all duration-500 hover:bg-white/10 group ${
                  visibleItems.has(index + 3)
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">{feature.title}</h4>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

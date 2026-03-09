import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

export function CTA() {
  return (
    <section className="relative py-24 bg-[#0a0c10] overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[150px]" />
      
      {/* Animated Border */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-8">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-400 text-sm font-medium">Gratis Selamanya</span>
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
          Siap Untuk{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-600">
            Transformasi
          </span>{' '}
          Tim Anda?
        </h2>

        {/* Description */}
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10">
          Bergabung dengan ribuan tim yang sudah menggunakan WorkGrid untuk meningkatkan produktivitas dan komunikasi mereka.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-cyan-500 hover:bg-cyan-400 text-[#0f1218] font-bold text-lg px-8 py-6 btn-glow glow-cyan"
            onClick={() => window.location.href = 'https://workgrid.homeku.net/login'}
          >
            Daftar Sekarang - Gratis
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-8 py-6 text-lg"
            onClick={() => window.location.href = 'https://workgrid.homeku.net/login'}
          >
            Masuk ke Aplikasi
          </Button>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Tidak perlu kartu kredit
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Setup dalam 2 menit
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Bisa dibatalkan kapan saja
          </div>
        </div>
      </div>
    </section>
  );
}

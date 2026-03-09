import { ParticleBackground } from '@/components/ParticleBackground';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/sections/Hero';
import { Features } from '@/sections/Features';
import { CTA } from '@/sections/CTA';
import { Footer } from '@/sections/Footer';

function App() {
  return (
    <div className="min-h-screen bg-[#050608] relative">
      {/* Particle background */}
      <ParticleBackground />
      
      {/* Content */}
      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
          <Features />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default App;

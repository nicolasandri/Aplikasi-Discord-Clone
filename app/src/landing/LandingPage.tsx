import './landing.css';
import { ParticleBackground } from './components/ParticleBackground';
import { Navbar } from './components/Navbar';
import { Hero } from './sections/Hero';
import { Features } from './sections/Features';
import { CTA } from './sections/CTA';
import { Footer } from './sections/Footer';

export function LandingPage() {
  return (
    <div className="landing-page min-h-screen bg-[#050608] relative overflow-x-hidden">
      <ParticleBackground />
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

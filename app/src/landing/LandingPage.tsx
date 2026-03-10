import { lazy, Suspense } from 'react';
import './landing.css';
import { Navbar } from './components/Navbar';
import { Hero } from './sections/Hero';

// Lazy load heavy sections below the fold
const ParticleBackground = lazy(() =>
  import('./components/ParticleBackground').then(m => ({ default: m.ParticleBackground }))
);
const Features = lazy(() =>
  import('./sections/Features').then(m => ({ default: m.Features }))
);
const CTA = lazy(() =>
  import('./sections/CTA').then(m => ({ default: m.CTA }))
);
const Footer = lazy(() =>
  import('./sections/Footer').then(m => ({ default: m.Footer }))
);

export function LandingPage() {
  return (
    <div className="landing-page min-h-screen bg-[#050608] relative overflow-x-hidden">
      <Suspense fallback={null}>
        <ParticleBackground />
      </Suspense>
      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
          <Suspense fallback={<div className="h-96 bg-[#050608]" />}>
            <Features />
          </Suspense>
          <Suspense fallback={<div className="h-64 bg-[#050608]" />}>
            <CTA />
          </Suspense>
        </main>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </div>
    </div>
  );
}

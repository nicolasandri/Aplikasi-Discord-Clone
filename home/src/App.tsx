import { Navbar } from '@/components/Navbar';
import { Hero } from '@/sections/Hero';
import { Features } from '@/sections/Features';
import { CTA } from '@/sections/CTA';
import { Footer } from '@/sections/Footer';

function App() {
  return (
    <div className="min-h-screen bg-[#0a0c10]">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export default App;

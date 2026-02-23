import { useState, useEffect } from 'react';

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('lg');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let bp: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'lg';
      
      if (width < 640) {
        bp = 'xs';
      } else if (width < 768) {
        bp = 'sm';
      } else if (width < 1024) {
        bp = 'md';
      } else if (width < 1280) {
        bp = 'lg';
      } else {
        bp = 'xl';
      }
      
      setBreakpoint(bp);
      setIsMobile(bp === 'xs');
      setIsTablet(bp === 'sm' || bp === 'md');
      setIsDesktop(bp === 'lg' || bp === 'xl');
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { 
    breakpoint, 
    isMobile, 
    isTablet, 
    isDesktop,
    width: typeof window !== 'undefined' ? window.innerWidth : 1024
  };
}

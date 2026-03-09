import { motion } from 'framer-motion';

interface GlitchTextProps {
  text: string;
  className?: string;
}

export function GlitchText({ text, className = '' }: GlitchTextProps) {
  return (
    <motion.div 
      className={`relative inline-block ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Main text */}
      <span className="relative z-10">{text}</span>
      
      {/* Glitch layers */}
      <span 
        className="absolute top-0 left-0 -z-10 text-red-500 opacity-70 animate-glitch-1"
        aria-hidden="true"
      >
        {text}
      </span>
      <span 
        className="absolute top-0 left-0 -z-10 text-cyan-500 opacity-70 animate-glitch-2"
        aria-hidden="true"
      >
        {text}
      </span>
      
      {/* Glow effect */}
      <span 
        className="absolute top-0 left-0 -z-20 blur-lg text-cyan-400 opacity-50"
        aria-hidden="true"
      >
        {text}
      </span>
    </motion.div>
  );
}

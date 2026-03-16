import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface TextScrambleProps {
  text: string;
  className?: string;
  delay?: number;
}

const chars = '!<>-_\\/[]{}—=+*^?#________';

export function TextScramble({ text, className = '', delay = 0 }: TextScrambleProps) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const frameRef = useRef(0);
  const queueRef = useRef<{ from: string; to: string; start: number; end: number; char?: string }[]>([]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const length = text.length;
      queueRef.current = [];

      for (let i = 0; i < length; i++) {
        queueRef.current.push({
          from: chars[Math.floor(Math.random() * chars.length)],
          to: text[i],
          start: Math.floor(Math.random() * 20),
          end: Math.floor(Math.random() * 20) + 20,
        });
      }

      let frame = 0;
      const update = () => {
        let output = '';
        let complete = 0;

        for (let i = 0; i < queueRef.current.length; i++) {
          const { from, to, start, end } = queueRef.current[i];
          let char = queueRef.current[i].char;

          if (frame >= end) {
            complete++;
            output += to;
          } else if (frame >= start) {
            if (!char || Math.random() < 0.28) {
              char = chars[Math.floor(Math.random() * chars.length)];
              queueRef.current[i].char = char;
            }
            output += char;
          } else {
            output += from;
          }
        }

        setDisplayText(output);

        if (complete === queueRef.current.length) {
          setIsComplete(true);
        } else {
          frameRef.current = requestAnimationFrame(update);
          frame++;
        }
      };

      update();
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frameRef.current);
    };
  }, [text, delay]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {displayText || text.split('').map(() => ' ').join('')}
      {!isComplete && (
        <span className="inline-block w-0.5 h-[1em] bg-cyan-400 ml-1 animate-pulse" />
      )}
    </motion.span>
  );
}

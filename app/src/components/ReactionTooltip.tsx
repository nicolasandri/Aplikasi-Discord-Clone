import { useState, useRef } from 'react';

interface ReactionTooltipProps {
  emoji: string;
  usernames: string[];
  children: React.ReactNode;
}

export function ReactionTooltip({ emoji, usernames, children }: ReactionTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle mouse enter/leave
  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => setIsVisible(false);

  // Format usernames list (Discord style)
  const formatUsernames = (names: string[]): string => {
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]}`;
    return `${names[0]}, ${names[1]}, ${names[2]} and ${names.length - 3} others`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {/* Tooltip */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          <div className="bg-[#111214] border border-[#23262e] rounded-lg shadow-xl px-3 py-2 min-w-[120px] max-w-[280px]">
            {/* Large Emoji Display */}
            <div className="flex justify-center mb-2">
              <span 
                className="text-4xl"
                style={{ fontFamily: '"Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "Apple Color Emoji", sans-serif' }}
              >
                {emoji}
              </span>
            </div>
            
            {/* Reaction Text */}
            <div className="text-center">
              <span className="text-[#dbdee1] text-sm font-medium break-words">
                {formatUsernames(usernames)}
              </span>
              <span className="text-[#949ba4] text-sm ml-1">
                reacted with {emoji}
              </span>
            </div>
          </div>
          
          {/* Arrow */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#111214] border-r border-b border-[#23262e] rotate-45"></div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  useEffect(() => {
    // Check if running in Electron
    if (window.electronAPI) {
      console.log('Platform:', window.electronAPI.platform);
    }
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  // Don't show custom title bar on web
  if (!window.electronAPI) {
    return null;
  }

  return (
    <div 
      className="h-8 bg-[#202225] flex items-center justify-between select-none"
      style={{ ['WebkitAppRegion' as any]: 'drag' }}
    >
      {/* Left - App Icon and Title */}
      <div className="flex items-center gap-2 px-4">
        <img 
          src="./workgrid_logo_main.png" 
          alt="WorkGrid" 
          className="w-6 h-6 rounded object-contain"
          onError={(e) => {
            // Fallback if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = '<div class="w-6 h-6 bg-[#5865f2] rounded flex items-center justify-center"><span class="text-white text-[10px] font-bold">W</span></div>';
          }}
        />
        <span className="text-[#b9bbbe] text-xs">WorkGrid</span>
      </div>

      {/* Center - Draggable area */}
      <div className="flex-1 h-full" />

      {/* Right - Window Controls */}
      <div 
        className="flex items-center h-full"
        style={{ ['WebkitAppRegion' as any]: 'no-drag' }}
      >
        <button
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center text-[#b9bbbe] hover:bg-[#36393f] hover:text-white transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center text-[#b9bbbe] hover:bg-[#36393f] hover:text-white transition-colors"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center text-[#b9bbbe] hover:bg-[#ed4245] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

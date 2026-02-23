import { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageViewer({ src, alt = 'Image', isOpen, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.5, 0.5));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = alt.replace(/[^a-zA-Z0-9]/g, '_') + '.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        <div className="flex items-center gap-4">
          <span className="text-white text-sm">{alt}</span>
          <span className="text-gray-400 text-sm">{Math.round(scale * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <button
            onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors ml-2"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div 
        className="flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain transition-transform duration-100"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
          draggable={false}
        />
      </div>

      {/* Footer - Instructions */}
      <div className="px-4 py-2 bg-black/50 text-center">
        <p className="text-gray-400 text-xs">
          Scroll to zoom • Drag to pan when zoomed • ESC to close
        </p>
      </div>
    </div>
  );
}

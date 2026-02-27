import { useState, useEffect, useCallback } from 'react';
import { X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';

// Helper to get full file URL (same as ChatArea)
const getFileUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const baseUrl = 'http://localhost:3001';
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${normalizedUrl}`;
};

interface Attachment {
  id: string;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

interface LightboxProps {
  attachments: Attachment[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

export function Lightbox({ attachments, currentIndex, isOpen, onClose, onNavigate }: LightboxProps) {
  const [index, setIndex] = useState(currentIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentAttachment = attachments[index];
  const isImage = currentAttachment?.mimetype?.startsWith('image/');
  const isVideo = currentAttachment?.mimetype?.startsWith('video/');
  const isPDF = currentAttachment?.mimetype === 'application/pdf';

  // Reset state when attachment changes
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setIsLoading(true);
    setError(null);
  }, [index]);

  // Update index when currentIndex prop changes
  useEffect(() => {
    setIndex(currentIndex);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          navigate(-1);
          break;
        case 'ArrowRight':
          navigate(1);
          break;
        case '+':
        case '=':
          if (isImage) zoomIn();
          break;
        case '-':
          if (isImage) zoomOut();
          break;
        case '0':
          if (isImage) resetZoom();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, index, attachments.length, isImage]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const navigate = useCallback((direction: number) => {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < attachments.length) {
      setIndex(newIndex);
      onNavigate?.(newIndex);
    }
  }, [index, attachments.length, onNavigate]);

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const resetZoom = () => {
    setScale(1);
    setRotation(0);
  };
  const rotate = () => setRotation(r => (r + 90) % 360);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentAttachment.url;
    link.download = currentAttachment.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype.startsWith('video/')) return '🎬';
    if (mimetype.startsWith('audio/')) return '🎵';
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    if (mimetype.includes('zip') || mimetype.includes('compressed')) return '📦';
    return '📎';
  };

  if (!isOpen || !currentAttachment) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 flex-shrink-0">
        <div className="flex items-center gap-3 text-white min-w-0">
          <span className="font-medium truncate" title={currentAttachment.filename}>
            {currentAttachment.filename}
          </span>
          <span className="text-sm text-gray-400 flex-shrink-0">
            ({formatFileSize(currentAttachment.size)})
          </span>
          {attachments.length > 1 && (
            <span className="text-sm text-gray-400 flex-shrink-0">
              {index + 1} / {attachments.length}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Zoom controls - only for images */}
          {isImage && (
            <>
              <button
                onClick={zoomOut}
                className="p-2 text-white hover:bg-white/10 rounded transition-colors"
                title="Zoom out (-)"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-white text-sm w-14 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="p-2 text-white hover:bg-white/10 rounded transition-colors"
                title="Zoom in (+)"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={rotate}
                className="p-2 text-white hover:bg-white/10 rounded transition-colors"
                title="Rotate"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-600 mx-2" />
            </>
          )}
          
          <button
            onClick={handleDownload}
            className="p-2 text-white hover:bg-white/10 rounded transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
          
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/10 rounded transition-colors ml-1"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative min-h-0">
        {/* Navigation arrows */}
        {attachments.length > 1 && (
          <>
            <button
              onClick={() => navigate(-1)}
              disabled={index === 0}
              className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={() => navigate(1)}
              disabled={index === attachments.length - 1}
              className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        {/* Loading spinner */}
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center text-white z-10">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-[#5865F2] rounded hover:bg-[#4752C4] transition-colors"
            >
              Download File
            </button>
          </div>
        )}

        {/* Image Preview */}
        {isImage && !error && (
          <img
            src={getFileUrl(currentAttachment.url)}
            alt={currentAttachment.filename}
            className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              cursor: scale > 1 ? 'grab' : 'default'
            }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Failed to load image');
            }}
            onClick={(e) => {
              // Double click to zoom
              if (e.detail === 2) {
                scale === 1 ? zoomIn() : resetZoom();
              }
            }}
          />
        )}

        {/* Video Preview */}
        {isVideo && !error && (
          <video
            src={getFileUrl(currentAttachment.url)}
            controls
            className="max-w-full max-h-full"
            onLoadedData={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Failed to load video');
            }}
          />
        )}

        {/* PDF Preview */}
        {isPDF && !error && (
          <iframe
            src={`${currentAttachment.url}#toolbar=1&navpanes=0`}
            className="w-full h-full bg-white"
            onLoad={() => setIsLoading(false)}
            title={currentAttachment.filename}
          />
        )}

        {/* Other files - show icon + download button */}
        {!isImage && !isVideo && !isPDF && !error && (
          <div className="text-center text-white z-10">
            <div className="w-24 h-24 mx-auto mb-4 bg-[#5865F2]/20 rounded-2xl flex items-center justify-center text-5xl">
              {getFileIcon(currentAttachment.mimetype)}
            </div>
            <p className="text-lg mb-2">{currentAttachment.filename}</p>
            <p className="text-sm text-gray-400 mb-6">
              {formatFileSize(currentAttachment.size)}
            </p>
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-[#5865F2] rounded-lg hover:bg-[#4752C4] transition-colors flex items-center gap-2 mx-auto"
            >
              <Download className="w-5 h-5" />
              Download File
            </button>
          </div>
        )}
      </div>

      {/* Thumbnail strip for images */}
      {attachments.length > 1 && (
        <div className="h-20 bg-black/50 flex items-center gap-2 px-4 overflow-x-auto flex-shrink-0">
          {attachments.map((att, i) => (
            <button
              key={att.id}
              onClick={() => setIndex(i)}
              className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-colors ${
                i === index ? 'border-[#5865F2]' : 'border-transparent hover:border-white/30'
              }`}
              title={att.filename}
            >
              {att.mimetype?.startsWith('image/') ? (
                <img
                  src={getFileUrl(att.url)}
                  alt={att.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#2B2D31] flex items-center justify-center text-xl">
                  {getFileIcon(att.mimetype)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

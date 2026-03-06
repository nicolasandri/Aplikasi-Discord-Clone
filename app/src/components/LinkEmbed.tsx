import { useEffect, useState, useCallback } from 'react';
import { ExternalLink, ImageOff } from 'lucide-react';

interface LinkEmbedData {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  siteName: string;
  favicon: string | null;
  color: string | null;
  error?: string;
}

interface LinkEmbedProps {
  url: string;
}

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

// Cache untuk menyimpan hasil fetch link preview
const embedCache = new Map<string, LinkEmbedData>();

export function LinkEmbed({ url }: LinkEmbedProps) {
  const [embedData, setEmbedData] = useState<LinkEmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const fetchEmbed = useCallback(async () => {
    // Check cache first
    if (embedCache.has(url)) {
      setEmbedData(embedCache.get(url)!);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/link-preview?url=${encodeURIComponent(url)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        embedCache.set(url, data);
        setEmbedData(data);
      } else {
        // Fallback ke basic info
        const parsedUrl = new URL(url);
        const fallbackData: LinkEmbedData = {
          url,
          title: parsedUrl.hostname,
          description: null,
          image: null,
          siteName: parsedUrl.hostname.replace(/^www\./, ''),
          favicon: `${parsedUrl.protocol}//${parsedUrl.hostname}/favicon.ico`,
          color: null,
        };
        setEmbedData(fallbackData);
      }
    } catch (error) {
      console.error('Failed to fetch link preview:', error);
      // Fallback ke basic info
      try {
        const parsedUrl = new URL(url);
        const fallbackData: LinkEmbedData = {
          url,
          title: parsedUrl.hostname,
          description: null,
          image: null,
          siteName: parsedUrl.hostname.replace(/^www\./, ''),
          favicon: `${parsedUrl.protocol}//${parsedUrl.hostname}/favicon.ico`,
          color: null,
        };
        setEmbedData(fallbackData);
      } catch {
        // Invalid URL
      }
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchEmbed();
  }, [fetchEmbed]);

  if (loading) {
    return (
      <div className="mt-2 max-w-[500px] rounded-lg bg-[#2B2D31] border-l-4 border-[#5865F2] overflow-hidden animate-pulse">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-[#404249]" />
            <div className="h-3 w-24 bg-[#404249] rounded" />
          </div>
          <div className="h-4 w-full bg-[#404249] rounded mb-2" />
          <div className="h-3 w-3/4 bg-[#404249] rounded" />
        </div>
      </div>
    );
  }

  if (!embedData) return null;

  const accentColor = embedData.color || '#5865F2';

  const handleClick = () => {
    window.open(embedData.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      onClick={handleClick}
      className="mt-2 max-w-[500px] rounded-lg bg-[#2B2D31] hover:bg-[#313338] border-l-4 overflow-hidden cursor-pointer transition-colors group"
      style={{ borderLeftColor: accentColor }}
    >
      <div className="p-3">
        {/* Site info */}
        <div className="flex items-center gap-2 mb-2">
          {embedData.favicon && (
            <img 
              src={embedData.favicon} 
              alt="" 
              className="w-4 h-4 rounded-sm object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <span className="text-xs text-[#949BA4] font-medium uppercase tracking-wide">
            {embedData.siteName}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[#00AFF4] font-semibold text-sm mb-1 group-hover:underline line-clamp-2">
          {embedData.title}
        </h3>

        {/* Description */}
        {embedData.description && (
          <p className="text-[#B5BAC1] text-xs line-clamp-3 mb-2">
            {embedData.description}
          </p>
        )}

        {/* Image */}
        {embedData.image && !imageError && (
          <div className="mt-2 rounded-md overflow-hidden bg-[#1E1F22]">
            <img 
              src={embedData.image} 
              alt={embedData.title}
              className="w-full max-h-[300px] object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {/* External link indicator */}
        <div className="flex items-center gap-1 mt-2 text-[#949BA4] text-xs">
          <ExternalLink className="w-3 h-3" />
          <span className="truncate">{new URL(embedData.url).hostname}</span>
        </div>
      </div>
    </div>
  );
}

// Helper function untuk mengekstrak URL dari teks
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,;!?\s])/g;
  const matches = text.match(urlRegex);
  return matches ? [...new Set(matches)] : [];
}

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Loader2, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';

interface GIF {
  id: string;
  url: string;
  preview: string;
  title: string;
}

interface GIFPickerProps {
  onSelect: (gif: { url: string; title: string; width?: number }) => void;
}

// API URL configuration
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = import.meta.env.VITE_API_URL;

// Mock GIFs sebagai fallback
const MOCK_GIFS: GIF[] = [
  { id: '1', url: 'https://media.giphy.com/media/3o7TKtnuHOHHUjR38Y/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKtnuHOHHUjR38Y/200w.gif', title: 'Hello' },
  { id: '2', url: 'https://media.giphy.com/media/l0HlOvJ7yaacpuSas/giphy.gif', preview: 'https://media.giphy.com/media/l0HlOvJ7yaacpuSas/200w.gif', title: 'Thank You' },
  { id: '3', url: 'https://media.giphy.com/media/3o7TKU8RvQuomFfUUU/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKU8RvQuomFfUUU/200w.gif', title: 'Happy' },
  { id: '4', url: 'https://media.giphy.com/media/l0HlPystfePnAI3Z6/giphy.gif', preview: 'https://media.giphy.com/media/l0HlPystfePnAI3Z6/200w.gif', title: 'Good Morning' },
  { id: '5', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/200w.gif', title: 'Good Night' },
  { id: '6', url: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif', preview: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/200w.gif', title: 'Love' },
  { id: '7', url: 'https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKTDn976rzVgky4/200w.gif', title: 'Hug' },
  { id: '8', url: 'https://media.giphy.com/media/l0HlR3kHtkgFbYfgQ/giphy.gif', preview: 'https://media.giphy.com/media/l0HlR3kHtkgFbYfgQ/200w.gif', title: 'Laugh' },
  { id: '9', url: 'https://media.giphy.com/media/3o7TKVgGQh4uOuJbKo/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKVgGQh4uOuJbKo/200w.gif', title: 'Sad' },
  { id: '10', url: 'https://media.giphy.com/media/l0HlPystfePnAI3Z6/giphy.gif', preview: 'https://media.giphy.com/media/l0HlPystfePnAI3Z6/200w.gif', title: 'Angry' },
  { id: '11', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/200w.gif', title: 'Surprised' },
  { id: '12', url: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif', preview: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/200w.gif', title: 'Cute' },
];

// Trending search terms untuk filter
const TRENDING_TERMS = ['hello', 'thank you', 'love', 'hug', 'laugh', 'sad', 'good morning', 'good night'];

// GIF size options - hanya Sedang (300px)
type GIFSize = 'medium';
const SIZE_OPTIONS: { value: GIFSize; label: string; width: number }[] = [
  { value: 'medium', label: 'Sedang', width: 300 },
];

// Function to resize GIF URL - hanya 300px (Sedang)
const resizeGIF = (url: string, _size: GIFSize): string => {
  // URL sudah dalam ukuran yang tepat dari transformGiphyData
  // Tidak perlu modifikasi lagi
  return url;
};

export function GIFPicker({ onSelect }: GIFPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GIF[]>(MOCK_GIFS);
  const [isLoading, setIsLoading] = useState(false);
  const [useMockData, setUseMockData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transform GIPHY response - menggunakan downsized untuk URL yang lebih reliable
  const transformGiphyData = (data: any[]): GIF[] => {
    return data.map((item: any) => {
      // Cari URL yang valid untuk main GIF (max 300-480px untuk performance)
      const url = item.images?.fixed_height_downsampled?.url ||  // ~200px, compressed
                 item.images?.fixed_height?.url ||               // ~200px
                 item.images?.downsized_medium?.url ||          // ~300px
                 item.images?.downsized?.url ||                 // ~300px
                 item.images?.original?.url || '';               // fallback
      
      // Preview menggunakan versi kecil
      const preview = item.images?.fixed_height_downsampled?.url || 
                     item.images?.preview_gif?.url || 
                     item.images?.fixed_height?.url || url;
      
      return {
        id: item.id,
        url,
        preview,
        title: item.title || 'GIF',
      };
    }).filter((gif: GIF) => gif.url && gif.preview);
  };

  // Fetch trending GIFs dari GIPHY
  const { token } = useAuth();

  const fetchTrendingGIFs = useCallback(async () => {
    if (useMockData) {
      setGifs(MOCK_GIFS);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      // Use backend proxy to avoid CSP issues
      const response = await fetch(
        `${API_URL}/giphy/trending`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      const formattedGIFs = transformGiphyData(data.data);
      
      if (formattedGIFs.length > 0) {
        setGifs(formattedGIFs);
        setUseMockData(false);
      } else {
        setGifs(MOCK_GIFS);
      }
    } catch (err) {
      console.error('Error fetching GIFs:', err);
      setGifs(MOCK_GIFS);
      setUseMockData(true);
    } finally {
      setIsLoading(false);
    }
  }, [useMockData, token]);

  // Search GIFs dari GIPHY via backend proxy
  const searchGIFs = useCallback(async (query: string) => {
    if (!query.trim()) {
      fetchTrendingGIFs();
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use backend proxy to avoid CSP issues
      const response = await fetch(
        `${API_URL}/giphy/search?q=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (!response.ok) throw new Error('Failed to search');
      
      const data = await response.json();
      const formattedGIFs = transformGiphyData(data.data);
      
      if (formattedGIFs.length > 0) {
        setGifs(formattedGIFs);
        setUseMockData(false);
      } else {
        // Fallback ke filter mock data
        const filtered = MOCK_GIFS.filter(gif => 
          gif.title.toLowerCase().includes(query.toLowerCase())
        );
        setGifs(filtered.length > 0 ? filtered : MOCK_GIFS);
      }
    } catch (err) {
      console.error('Error searching GIFs:', err);
      // Fallback ke filter mock data
      const filtered = MOCK_GIFS.filter(gif => 
        gif.title.toLowerCase().includes(query.toLowerCase())
      );
      setGifs(filtered.length > 0 ? filtered : MOCK_GIFS);
      setUseMockData(true);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTrendingGIFs, token]);

  // Load saat buka
  useEffect(() => {
    if (isOpen) {
      fetchTrendingGIFs();
    }
  }, [isOpen, fetchTrendingGIFs]);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      searchGIFs(searchQuery);
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchQuery, searchGIFs]);

  const handleSelect = (gif: GIF) => {
    // Langsung kirim GIF dengan ukuran sedang (300px)
    const resizedUrl = resizeGIF(gif.url, 'medium');
    onSelect({ url: resizedUrl, title: gif.title, width: 300 });
    setIsOpen(false);
  };

  const openGiphyDev = () => {
    window.open('https://developers.giphy.com/', '_blank');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className="w-full h-full flex items-center justify-center text-[#a0a0b0] hover:text-white transition-colors"
          title="Kirim GIF"
        >
          <span className="text-[11px] font-bold border border-current rounded px-1 leading-none py-0.5">
            GIF
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0 bg-[#232438] border-[#0f0f1a]" 
        style={{ height: '500px', maxHeight: '500px' }}
        align="end"
        side="top"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#0f0f1a]">
            <span className="text-white font-medium">Pilih GIF</span>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-[#ed4245]/20 rounded text-[#6a6a7a] hover:text-[#ed4245]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-4 py-2 border-b border-[#0f0f1a]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6a7a]" />
              <Input
                placeholder="Cari GIF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#0f0f1a] border-none text-white placeholder:text-[#6a6a7a]"
              />
            </div>
          </div>

          {/* Quick Filters */}
          {!searchQuery && (
            <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-[#0f0f1a]">
              {TRENDING_TERMS.map((term) => (
                <button
                  key={term}
                  onClick={() => setSearchQuery(term)}
                  className="px-3 py-1 text-xs bg-[#2a2b3d] hover:bg-[#00d4ff] text-[#a0a0b0] hover:text-white rounded-full transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          )}

          {/* Content - Scrollable area */}
          <div 
            className="flex-1 overflow-y-auto p-4 gif-picker-scroll"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#40444b transparent'
            }}
          >
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-[#00d4ff] animate-spin" />
              </div>
            ) : gifs.length === 0 ? (
              <div className="text-center py-8 text-[#6a6a7a]">
                <div className="text-4xl mb-2">🎉</div>
                <p>Tidak ada GIF ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => handleSelect(gif)}
                    className="relative aspect-video bg-[#0f0f1a] rounded-lg overflow-hidden hover:ring-2 hover:ring-[#00d4ff] transition-all group"
                  >
                    <img
                      src={gif.preview}
                      alt={gif.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer - API Info */}
          {useMockData && (
            <div className="px-4 py-2 border-t border-[#0f0f1a] bg-[#232438]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6a6a7a]">Menggunakan GIF demo</p>
                  <p className="text-[10px] text-[#00d4ff]">Untuk lebih banyak GIF, daftar gratis:</p>
                </div>
                <button
                  onClick={openGiphyDev}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#00d4ff] hover:bg-[#00b8db] text-white text-xs rounded-md transition-colors"
                >
                  <span>GIPHY Dev</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default GIFPicker;


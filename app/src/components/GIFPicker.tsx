import { useState, useEffect, useCallback } from 'react';
import { X, Search, Loader2, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface GIF {
  id: string;
  url: string;
  preview: string;
  title: string;
}

interface GIFPickerProps {
  onSelect: (gif: { url: string; title: string }) => void;
}

// GIPHY API Configuration
const GIPHY_API_KEY = 'YpMijmz8K3JNNhmssCfdWuYmluS0JDAW'; // API key dari user

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

export function GIFPicker({ onSelect }: GIFPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GIF[]>(MOCK_GIFS);
  const [isLoading, setIsLoading] = useState(false);
  const [useMockData, setUseMockData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transform GIPHY response
  const transformGiphyData = (data: any[]): GIF[] => {
    return data.map((item: any) => ({
      id: item.id,
      url: item.images?.original?.url || item.images?.fixed_height?.url || '',
      preview: item.images?.fixed_height_downsampled?.url || 
               item.images?.fixed_height?.url || 
               item.images?.preview_gif?.url || '',
      title: item.title || 'GIF',
    })).filter((gif: GIF) => gif.url && gif.preview);
  };

  // Fetch trending GIFs dari GIPHY
  const fetchTrendingGIFs = useCallback(async () => {
    if (useMockData) {
      setGifs(MOCK_GIFS);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g&lang=id`
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
  }, [useMockData]);

  // Search GIFs dari GIPHY
  const searchGIFs = useCallback(async (query: string) => {
    if (!query.trim()) {
      fetchTrendingGIFs();
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g&lang=id`
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
  }, [fetchTrendingGIFs]);

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
    onSelect({ url: gif.url, title: gif.title });
    setIsOpen(false);
  };

  const openGiphyDev = () => {
    window.open('https://developers.giphy.com/', '_blank');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className="flex items-center justify-center w-8 h-8 text-[#b9bbbe] hover:text-white hover:bg-[#4f545c] rounded-lg transition-colors"
          title="Kirim GIF"
        >
          <span className="text-[10px] font-bold border border-current rounded px-0.5 leading-none py-0.5">
            GIF
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] h-[500px] p-0 bg-[#2f3136] border-[#202225]" 
        align="end"
        side="top"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#202225]">
            <span className="text-white font-medium">Pilih GIF</span>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-[#ed4245]/20 rounded text-[#72767d] hover:text-[#ed4245]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-4 py-2 border-b border-[#202225]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72767d]" />
              <Input
                placeholder="Cari GIF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#202225] border-none text-white placeholder:text-[#72767d]"
              />
            </div>
          </div>

          {/* Quick Filters */}
          {!searchQuery && (
            <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-[#202225]">
              {TRENDING_TERMS.map((term) => (
                <button
                  key={term}
                  onClick={() => setSearchQuery(term)}
                  className="px-3 py-1 text-xs bg-[#40444b] hover:bg-[#5865f2] text-[#b9bbbe] hover:text-white rounded-full transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-[#5865f2] animate-spin" />
              </div>
            ) : gifs.length === 0 ? (
              <div className="text-center py-8 text-[#72767d]">
                <div className="text-4xl mb-2">🎉</div>
                <p>Tidak ada GIF ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => handleSelect(gif)}
                    className="relative aspect-video bg-[#202225] rounded-lg overflow-hidden hover:ring-2 hover:ring-[#5865f2] transition-all group"
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
          </ScrollArea>

          {/* Footer - API Info */}
          {useMockData && (
            <div className="px-4 py-2 border-t border-[#202225] bg-[#2f3136]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#72767d]">Menggunakan GIF demo</p>
                  <p className="text-[10px] text-[#5865f2]">Untuk lebih banyak GIF, daftar gratis:</p>
                </div>
                <button
                  onClick={openGiphyDev}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs rounded-md transition-colors"
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

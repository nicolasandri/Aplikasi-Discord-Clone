import { useState, useEffect, useCallback } from 'react';
import { X, Search, Loader2, Smile, Sticker, Gift } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiStickerGIFPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker?: (sticker: { url: string; name: string }) => void;
  onSelectGIF?: (gif: { url: string; title: string }) => void;
  serverId?: string | null;
  disabled?: boolean;
}

interface GIF {
  id: string;
  url: string;
  preview: string;
  title: string;
}

interface Sticker {
  id: string;
  name: string;
  description?: string;
  url: string;
}

interface CustomEmoji {
  id: string;
  name: string;
  url: string;
  isAnimated: boolean;
}

// GIPHY API Configuration
const GIPHY_API_KEY = 'YpMijmz8K3JNNhmssCfdWuYmluS0JDAW';
const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export function EmojiStickerGIFPicker({ onSelectEmoji, onSelectSticker, onSelectGIF, serverId, disabled }: EmojiStickerGIFPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('emoji');
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [gifs, setGifs] = useState<GIF[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const token = localStorage.getItem('token');

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

  // Fetch GIFs
  const fetchGIFs = useCallback(async (query?: string) => {
    setIsLoading(true);
    try {
      const endpoint = query 
        ? `${GIPHY_BASE_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g&lang=id`
        : `${GIPHY_BASE_URL}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g&lang=id`;
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      const formattedGIFs = transformGiphyData(data.data);
      setGifs(formattedGIFs);
    } catch (err) {
      console.error('Error fetching GIFs:', err);
      setGifs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch custom emojis and stickers
  const fetchServerData = useCallback(async () => {
    if (!serverId) return;
    
    try {
      // Fetch custom emojis
      const emojiResponse = await fetch(`${API_URL}/servers/${serverId}/emojis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (emojiResponse.ok) {
        const emojiData = await emojiResponse.json();
        setCustomEmojis(emojiData);
      }

      // Fetch stickers
      const stickerResponse = await fetch(`${API_URL}/servers/${serverId}/stickers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (stickerResponse.ok) {
        const stickerData = await stickerResponse.json();
        setStickers(stickerData);
      }
    } catch (error) {
      console.error('Error fetching emoji/sticker data:', error);
    }
  }, [serverId, token]);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'gif') {
        fetchGIFs();
      } else if (activeTab === 'emoji' || activeTab === 'stickers') {
        fetchServerData();
      }
    }
  }, [isOpen, activeTab, fetchGIFs, fetchServerData]);

  // Debounce GIF search
  useEffect(() => {
    if (activeTab === 'gif') {
      const timeout = setTimeout(() => {
        fetchGIFs(searchQuery);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [searchQuery, activeTab, fetchGIFs]);

  const handleEmojiSelect = (emoji: any) => {
    onSelectEmoji(emoji.native);
    setIsOpen(false);
  };

  const handleCustomEmojiSelect = (emoji: CustomEmoji) => {
    onSelectEmoji(`:${emoji.name}:`);
    setIsOpen(false);
  };

  const handleStickerSelect = (sticker: Sticker) => {
    if (onSelectSticker) {
      onSelectSticker({ url: sticker.url, name: sticker.name });
      setIsOpen(false);
    }
  };

  const handleGIFSelect = (gif: GIF) => {
    if (onSelectGIF) {
      onSelectGIF({ url: gif.url, title: gif.title });
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className="p-2 text-[#a0a0b0] hover:text-white hover:bg-[#4f545c] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Emoji, Sticker & GIF"
          disabled={disabled}
        >
          <Smile className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[420px] h-[500px] p-0 bg-[#232438] border-[#0f0f1a] overflow-hidden" 
        align="end"
        side="top"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          {/* Header with Tabs */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#0f0f1a]">
            <TabsList className="bg-transparent p-0 gap-1">
              <TabsTrigger 
                value="emoji" 
                className="data-[state=active]:bg-[#2a2b3d] text-[#a0a0b0] data-[state=active]:text-white px-4 py-1.5 rounded-md text-sm flex items-center gap-1"
              >
                <Smile className="w-4 h-4" />
                Emoji
              </TabsTrigger>
              <TabsTrigger 
                value="stickers"
                className="data-[state=active]:bg-[#2a2b3d] text-[#a0a0b0] data-[state=active]:text-white px-4 py-1.5 rounded-md text-sm flex items-center gap-1"
              >
                <Sticker className="w-4 h-4" />
                Stickers
              </TabsTrigger>
              <TabsTrigger 
                value="gif"
                className="data-[state=active]:bg-[#2a2b3d] text-[#a0a0b0] data-[state=active]:text-white px-4 py-1.5 rounded-md text-sm flex items-center gap-1"
              >
                <Gift className="w-4 h-4" />
                GIFs
              </TabsTrigger>
            </TabsList>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-[#ed4245]/20 rounded text-[#6a6a7a] hover:text-[#ed4245]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Emoji Tab */}
          <TabsContent value="emoji" className="flex-1 m-0 overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Custom Emojis Section */}
              {customEmojis.length > 0 && (
                <div className="px-4 py-2 border-b border-[#0f0f1a]">
                  <p className="text-xs text-[#6a6a7a] mb-2">Server Emojis</p>
                  <div className="flex flex-wrap gap-1">
                    {customEmojis.map((emoji) => (
                      <button
                        key={emoji.id}
                        onClick={() => handleCustomEmojiSelect(emoji)}
                        className="w-8 h-8 hover:bg-[#2a2b3d] rounded flex items-center justify-center"
                        title={emoji.name}
                      >
                        <img 
                          src={emoji.url} 
                          alt={emoji.name}
                          className="w-6 h-6"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Standard Emoji Picker */}
              <div className="flex-1 overflow-hidden">
                <Picker 
                  data={data} 
                  onEmojiSelect={handleEmojiSelect}
                  theme="dark"
                  previewPosition="none"
                  skinTonePosition="none"
                  navPosition="bottom"
                />
              </div>
            </div>
          </TabsContent>

          {/* Stickers Tab */}
          <TabsContent value="stickers" className="flex-1 m-0">
            <div className="h-full flex flex-col">
              <ScrollArea className="flex-1 p-4">
                {stickers.length === 0 ? (
                  <div className="text-center py-8 text-[#6a6a7a]">
                    <Sticker className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No stickers yet</p>
                    <p className="text-xs mt-1">Upload stickers in server settings</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {stickers.map((sticker) => (
                      <button
                        key={sticker.id}
                        onClick={() => handleStickerSelect(sticker)}
                        className="relative aspect-square bg-[#0f0f1a] rounded-lg overflow-hidden hover:ring-2 hover:ring-[#00d4ff] transition-all group p-2"
                        title={sticker.name}
                      >
                        <img
                          src={sticker.url}
                          alt={sticker.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* GIFs Tab */}
          <TabsContent value="gif" className="flex-1 m-0">
            <div className="h-full flex flex-col">
              {/* Search Bar */}
              <div className="px-4 py-2 border-b border-[#0f0f1a]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6a7a]" />
                  <Input
                    placeholder="Search GIFs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#0f0f1a] border-none text-white placeholder:text-[#6a6a7a]"
                  />
                </div>
              </div>

              {/* GIFs Grid */}
              <ScrollArea className="flex-1 p-4">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 text-[#00d4ff] animate-spin" />
                  </div>
                ) : gifs.length === 0 ? (
                  <div className="text-center py-8 text-[#6a6a7a]">
                    <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No GIFs found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {gifs.map((gif) => (
                      <button
                        key={gif.id}
                        onClick={() => handleGIFSelect(gif)}
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
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

export default EmojiStickerGIFPicker;


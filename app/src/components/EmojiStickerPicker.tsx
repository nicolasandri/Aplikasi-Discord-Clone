import { useState, useEffect, useCallback } from 'react';
import { X, Search, Loader2, Smile, Sticker } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiStickerPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (sticker: { url: string; name: string }) => void;
  serverId?: string | null;
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

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = import.meta.env.VITE_API_URL;

export function EmojiStickerPicker({ onSelectEmoji, onSelectSticker, serverId }: EmojiStickerPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('emoji');
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const token = localStorage.getItem('token');

  // Fetch custom emojis and stickers
  const fetchData = useCallback(async () => {
    if (!serverId) return;
    
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [serverId, token]);

  useEffect(() => {
    if (isOpen && serverId) {
      fetchData();
    }
  }, [isOpen, serverId, fetchData]);

  const handleEmojiSelect = (emoji: any) => {
    onSelectEmoji(emoji.native);
    setIsOpen(false);
  };

  const handleCustomEmojiSelect = (emoji: CustomEmoji) => {
    onSelectEmoji(`:${emoji.name}:`);
    setIsOpen(false);
  };

  const handleStickerSelect = (sticker: Sticker) => {
    onSelectSticker({ url: sticker.url, name: sticker.name });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className="p-2 text-[#a0a0b0] hover:text-white hover:bg-[#4f545c] rounded-full transition-colors"
          title="Emoji & Sticker"
        >
          <Smile className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[420px] h-[480px] p-0 bg-[#232438] border-[#0f0f1a] overflow-hidden" 
        align="end"
        side="top"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          {/* Header with Tabs */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#0f0f1a]">
            <TabsList className="bg-transparent p-0 gap-1">
              <TabsTrigger 
                value="emoji" 
                className="data-[state=active]:bg-[#2a2b3d] text-[#a0a0b0] data-[state=active]:text-white px-4 py-1.5 rounded-md text-sm"
              >
                <Smile className="w-4 h-4 mr-1" />
                Emoji
              </TabsTrigger>
              <TabsTrigger 
                value="stickers"
                className="data-[state=active]:bg-[#2a2b3d] text-[#a0a0b0] data-[state=active]:text-white px-4 py-1.5 rounded-md text-sm"
              >
                <Sticker className="w-4 h-4 mr-1" />
                Stickers
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
                          className={`w-6 h-6 ${emoji.isAnimated ? '' : ''}`}
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
              {/* Search */}
              <div className="px-4 py-2 border-b border-[#0f0f1a]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6a7a]" />
                  <Input
                    placeholder="Cari sticker..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#0f0f1a] border-none text-white placeholder:text-[#6a6a7a]"
                  />
                </div>
              </div>

              {/* Stickers Grid */}
              <ScrollArea className="flex-1 p-4">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 text-[#00d4ff] animate-spin" />
                  </div>
                ) : stickers.length === 0 ? (
                  <div className="text-center py-8 text-[#6a6a7a]">
                    <Sticker className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Belum ada sticker</p>
                    <p className="text-xs mt-1">Upload sticker di server settings</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {stickers
                      .filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((sticker) => (
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
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

export default EmojiStickerPicker;


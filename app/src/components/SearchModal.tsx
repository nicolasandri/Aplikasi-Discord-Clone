import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Filter, Calendar, User, Hash, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface SearchResult {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar: string;
  channel_id: string;
  channel_name: string;
  server_id: string;
}

interface SearchFilters {
  dateFrom: string;
  dateTo: string;
  userId: string;
  hasAttachments: boolean | null;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId?: string;
  channelId?: string;
}

export function SearchModal({ isOpen, onClose, serverId, channelId }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    dateFrom: '',
    dateTo: '',
    userId: '',
    hasAttachments: null
  });
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  
  const { token } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const LIMIT = 25;
  
  const search = useCallback(async (resetOffset = true) => {
    if (!query.trim() && !filters.userId) return;
    
    setLoading(true);
    const newOffset = resetOffset ? 0 : offset;
    
    try {
      const params = new URLSearchParams({
        q: query,
        limit: LIMIT.toString(),
        offset: newOffset.toString()
      });
      
      if (serverId) params.append('server_id', serverId);
      if (channelId) params.append('channel_id', channelId);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.userId) params.append('user_id', filters.userId);
      if (filters.hasAttachments !== null) {
        params.append('has_attachments', filters.hasAttachments.toString());
      }
      
      const response = await fetch(
        `${API_URL}/search/messages?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      console.log('Search response:', data);
      
      // Handle both old and new response format
      const messages = data.messages || data.results || [];
      const pagination = data.pagination || { total: messages.length, hasMore: false };
      
      if (resetOffset) {
        setResults(messages);
      } else {
        setResults(prev => [...prev, ...messages]);
      }
      
      setHasMore(pagination.hasMore);
      setTotal(pagination.total);
      setOffset(newOffset + messages.length);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [query, filters, serverId, channelId, token, offset]);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() || filters.userId) {
        console.log('Searching with:', { query, serverId, channelId });
        search(true);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query, filters, serverId, channelId]);
  
  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  const loadMore = () => {
    if (!loading && hasMore) {
      search(false);
    }
  };
  
  const jumpToMessage = (messageId: string, channelId: string) => {
    // Navigate to channel and scroll to message
    onClose();
    // Trigger navigation event
    window.dispatchEvent(new CustomEvent('jumpToMessage', {
      detail: { messageId, channelId }
    }));
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setOffset(0);
    setHasMore(false);
    setTotal(0);
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#313338] w-full max-w-2xl rounded-lg shadow-xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded transition-colors ${showFilters ? 'bg-[#5865F2] text-white' : 'hover:bg-gray-700 text-gray-400'}`}
              title="Toggle filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-3 bg-[#2B2D31] rounded grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                  className="w-full mt-1 bg-[#1E1F22] text-white text-sm rounded px-2 py-1 outline-none focus:ring-2 focus:ring-[#5865F2]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> To
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                  className="w-full mt-1 bg-[#1E1F22] text-white text-sm rounded px-2 py-1 outline-none focus:ring-2 focus:ring-[#5865F2]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  <User className="w-3 h-3" /> From User
                </label>
                <input
                  type="text"
                  placeholder="User ID"
                  value={filters.userId}
                  onChange={(e) => setFilters(f => ({ ...f, userId: e.target.value }))}
                  className="w-full mt-1 bg-[#1E1F22] text-white text-sm rounded px-2 py-1 outline-none focus:ring-2 focus:ring-[#5865F2]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Has Attachments</label>
                <select
                  value={filters.hasAttachments === null ? '' : filters.hasAttachments.toString()}
                  onChange={(e) => setFilters(f => ({ 
                    ...f, 
                    hasAttachments: e.target.value === '' ? null : e.target.value === 'true'
                  }))}
                  className="w-full mt-1 bg-[#1E1F22] text-white text-sm rounded px-2 py-1 outline-none focus:ring-2 focus:ring-[#5865F2]"
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
          )}
        </div>
        
        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {query ? 'No results found' : 'Type to search messages'}
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-400 mb-3">
                Found {total} result{total !== 1 ? 's' : ''}
              </div>
              <div className="space-y-3">
                {results.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => jumpToMessage(msg.id, msg.channel_id)}
                    className="p-3 bg-[#2B2D31] rounded hover:bg-[#35373C] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src={msg.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`}
                        alt={msg.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="font-medium text-white">{msg.username}</span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(msg.created_at), 'MMM d, yyyy HH:mm')}
                      </span>
                      <span className="text-xs text-[#5865F2] flex items-center gap-1 ml-auto">
                        <Hash className="w-3 h-3" /> {msg.channel_name}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm pl-10 line-clamp-2">{msg.content}</p>
                  </div>
                ))}
              </div>
              
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full mt-4 py-2 text-[#5865F2] hover:underline disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load more'
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

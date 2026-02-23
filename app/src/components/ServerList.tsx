import { useState } from 'react';
import { Plus, Compass, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Server } from '@/types';

interface ServerListProps {
  servers: Server[];
  selectedServerId: string | null;
  onSelectServer: (serverId: string) => void;
  onCreateServer: (name: string, icon: string) => void;
}

export function ServerList({ servers, selectedServerId, onSelectServer, onCreateServer }: ServerListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerIcon, setNewServerIcon] = useState('🌐');

  const handleCreateServer = () => {
    if (newServerName.trim()) {
      onCreateServer(newServerName.trim(), newServerIcon);
      setNewServerName('');
      setNewServerIcon('🌐');
      setIsCreateOpen(false);
    }
  };

  return (
    <div className="w-[72px] bg-[#202225] flex flex-col items-center py-3 gap-2 overflow-y-auto">
      {/* Home/DM Button */}
      <button
        onClick={() => onSelectServer('home')}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
          selectedServerId === 'home'
            ? 'bg-[#5865f2] rounded-2xl'
            : 'bg-[#36393f] hover:bg-[#5865f2] hover:rounded-2xl'
        }`}
      >
        <span className="text-xl">💬</span>
      </button>

      <div className="w-8 h-[2px] bg-[#36393f] rounded-full my-1" />

      {/* Server List */}
      {servers.map((server) => (
        <button
          key={server.id}
          onClick={() => onSelectServer(server.id)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 relative group overflow-hidden ${
            selectedServerId === server.id
              ? 'bg-[#5865f2] rounded-2xl'
              : 'bg-[#36393f] hover:bg-[#5865f2] hover:rounded-2xl'
          }`}
        >
          {server.icon.startsWith('http') ? (
            <img 
              src={server.icon} 
              alt={server.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-xl">🌐</span>';
              }}
            />
          ) : (
            <span className="text-2xl">{server.icon}</span>
          )}
          
          {/* Selected indicator */}
          {selectedServerId === server.id && (
            <div className="absolute -left-3 w-1 h-8 bg-white rounded-r-full" />
          )}
          
          {/* Hover indicator */}
          {selectedServerId !== server.id && (
            <div className="absolute -left-3 w-1 h-2 bg-white rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
          )}

          {/* Tooltip */}
          <div className="absolute left-16 bg-[#18191c] text-white text-sm px-3 py-2 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
            {server.name}
          </div>
        </button>
      ))}

      {/* Add Server Button */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogTrigger asChild>
          <button className="w-12 h-12 rounded-full bg-[#36393f] hover:bg-[#3ba55d] flex items-center justify-center transition-all duration-200 group mt-2">
            <Plus className="w-6 h-6 text-[#3ba55d] group-hover:text-white transition-colors" />
          </button>
        </DialogTrigger>
        <DialogContent className="bg-[#36393f] border-[#202225] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Buat Server Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-[#b9bbbe] text-sm">Nama Server</label>
              <Input
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="Server saya"
                className="bg-[#202225] border-[#040405] text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[#b9bbbe] text-sm">Icon (emoji)</label>
              <Input
                value={newServerIcon}
                onChange={(e) => setNewServerIcon(e.target.value)}
                placeholder="🌐"
                maxLength={2}
                className="bg-[#202225] border-[#040405] text-white"
              />
            </div>
            <Button
              onClick={handleCreateServer}
              className="w-full bg-[#5865f2] hover:bg-[#4752c4]"
            >
              Buat Server
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Explore Button */}
      <button className="w-12 h-12 rounded-full bg-[#36393f] hover:bg-[#5865f2] flex items-center justify-center transition-all duration-200 group">
        <Compass className="w-6 h-6 text-[#5865f2] group-hover:text-white transition-colors" />
      </button>

      <div className="w-8 h-[2px] bg-[#36393f] rounded-full my-1" />

      {/* Download App Button */}
      <button className="w-12 h-12 rounded-full bg-[#36393f] hover:bg-[#3ba55d] flex items-center justify-center transition-all duration-200 group">
        <Download className="w-6 h-6 text-[#3ba55d] group-hover:text-white transition-colors" />
      </button>
    </div>
  );
}

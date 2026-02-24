import { useState } from 'react';
import { Copy, Link, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface InviteModalProps {
  serverId: string;
  serverName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ serverId, serverName, isOpen, onClose }: InviteModalProps) {
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateInvite = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/servers/${serverId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          expiresIn: 24, // Expire after 24 hours
          maxUses: 0 // 0 = unlimited
        })
      });

      if (!response.ok) throw new Error('Gagal membuat undangan');

      const data = await response.json();
      const baseUrl = window.location.origin;
      setInviteCode(data.code);
      setInviteUrl(`${baseUrl}/invite/${data.code}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal membuat link undangan',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: 'Berhasil disalin!',
      description: 'Link undangan telah disalin'
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: 'Berhasil disalin!',
      description: 'Kode undangan telah disalin'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#36393f] border-[#202225] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Undang teman ke {serverName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          {!inviteUrl ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[#5865f2] rounded-full flex items-center justify-center mx-auto mb-4">
                <Link className="h-8 w-8 text-white" />
              </div>
              <p className="text-[#b9bbbe] mb-4">
                Bagikan server ini dengan teman-teman Anda!
              </p>
              <Button 
                onClick={generateInvite} 
                disabled={loading}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link className="h-4 w-4 mr-2" />
                )}
                Generate Invite Link
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#b9bbbe] uppercase">
                  Link Undangan
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Input
                      value={inviteUrl}
                      readOnly
                      className="bg-[#2f3136] border-[#202225] text-white pr-20"
                    />
                  </div>
                  <Button 
                    onClick={copyToClipboard}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
                    size="icon"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#b9bbbe] uppercase">
                  Kode Undangan
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={inviteCode}
                    readOnly
                    className="bg-[#2f3136] border-[#202225] text-white font-mono"
                  />
                  <Button 
                    onClick={copyCode}
                    variant="outline"
                    className="border-[#202225] text-white hover:bg-[#2f3136]"
                    size="icon"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-[#2f3136] rounded-lg p-4">
                <p className="text-sm text-[#b9bbbe]">
                  <span className="font-semibold text-white">Pro tip:</span> This link never expires and has unlimited uses. 
                  Share it with anyone you want to invite to this server!
                </p>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#202225]">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setInviteUrl('');
                    setInviteCode('');
                  }}
                  className="text-[#b9bbbe] hover:text-white hover:bg-[#2f3136]"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New
                </Button>
                <Button 
                  onClick={onClose}
                  className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

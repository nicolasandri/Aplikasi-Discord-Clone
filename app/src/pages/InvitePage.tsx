import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetchInviteInfo();
  }, [code]);

  const fetchInviteInfo = async () => {
    try {
      const response = await fetch(`/api/invites/${code}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid invite');
      }
      const data = await response.json();
      setInviteInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { redirectTo: `/invite/${code}` } });
      return;
    }

    try {
      setJoining(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/invites/${code}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'Already a member of this server') {
          toast({
            title: 'Sudah menjadi anggota',
            description: 'Mengarahkan ke server...'
          });
          setTimeout(() => {
            navigate(`/?server=${data.serverId}`);
          }, 1000);
          return;
        }
        throw new Error(data.error);
      }

      const data = await response.json();
      setJoined(true);
      toast({
        title: 'Berhasil!',
        description: `Anda telah bergabung dengan ${inviteInfo.serverName}`
      });
      setTimeout(() => {
        navigate(`/?server=${data.server.id}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Gagal bergabung ke server',
        variant: 'destructive'
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#36393f] flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-[#5865f2] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#36393f] flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-[#2f3136] border-[#202225]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-[#ed4245]">
              <AlertCircle className="h-12 w-12" />
              <div>
                <h3 className="font-semibold text-white text-lg">Undangan Tidak Valid</h3>
                <p className="text-[#b9bbbe] text-sm">{error}</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/')}
              className="w-full mt-6 bg-[#5865f2] hover:bg-[#4752c4] text-white"
            >
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-[#36393f] flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-[#2f3136] border-[#202225]">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-[#3ba55d] mx-auto mb-4" />
            <h3 className="font-semibold text-white text-xl mb-2">Berhasil Bergabung!</h3>
            <p className="text-[#b9bbbe]">Selamat datang di {inviteInfo.serverName}</p>
            <p className="text-[#b9bbbe] text-sm mt-2">Mengarahkan ke server...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#36393f] flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-[#2f3136] border-[#202225]">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 bg-[#5865f2] rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">{inviteInfo.serverName}</CardTitle>
          <p className="text-[#b9bbbe]">
            Anda diundang untuk bergabung
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center">
            <Avatar className="h-16 w-16 border-4 border-[#36393f]">
              <AvatarImage src={inviteInfo.serverIcon} />
              <AvatarFallback className="bg-[#5865f2] text-white text-xl">
                {inviteInfo.serverName[0]}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="text-center text-sm text-[#b9bbbe] space-y-1">
            {inviteInfo.expiresAt && (
              <p>Expires on {new Date(inviteInfo.expiresAt).toLocaleDateString()}</p>
            )}
            {inviteInfo.maxUses > 0 && (
              <p>Uses: {inviteInfo.uses} / {inviteInfo.maxUses}</p>
            )}
          </div>
          
          <Button 
            onClick={handleJoin} 
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white h-12 text-lg"
            disabled={joining}
          >
            {joining ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Joining...
              </>
            ) : isAuthenticated ? (
              'Accept Invite'
            ) : (
              'Login to Join'
            )}
          </Button>

          {isAuthenticated && (
            <p className="text-center text-xs text-[#b9bbbe]">
              Bergabung sebagai <span className="text-white font-semibold">{user?.username}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

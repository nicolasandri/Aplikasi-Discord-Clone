import { 
  Mic, 
  MicOff, 
  Headphones, 
  HeadphoneOff, 
  PhoneOff,
  Volume2,
  Users,
  Radio
} from 'lucide-react';
import { useVoiceChannel } from '@/hooks/useVoiceChannel';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface VoiceChannelPanelProps {
  channelId: string;
  channelName: string;
}

export function VoiceChannelPanel({ channelId, channelName }: VoiceChannelPanelProps) {
  const { user } = useAuth();
  const {
    isConnected,
    isMuted,
    isDeafened,
    participants,
    error,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen
  } = useVoiceChannel(channelId);

  // Not connected state
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
        <div className="p-3 rounded-full bg-primary/10">
          <Radio className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-sm">{channelName}</h3>
          <p className="text-xs text-muted-foreground mt-1">Voice Channel</p>
        </div>
        
        {error && (
          <p className="text-xs text-destructive text-center">{error}</p>
        )}
        
        <Button 
          onClick={joinVoice} 
          className="w-full"
          size="sm"
        >
          <Mic className="h-4 w-4 mr-2" />
          Gabung Voice
        </Button>
      </div>
    );
  }

  // Connected state
  return (
    <div className="flex flex-col p-4 space-y-4 bg-primary/5 rounded-lg border border-primary/10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="h-4 w-4 text-green-500" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <span className="font-medium text-sm">{channelName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{participants.length + 1}</span>
        </div>
      </div>

      {/* Participants */}
      <div className="space-y-2">
        {/* Self */}
        <div className={cn(
          "flex items-center gap-3 p-2.5 rounded-md transition-colors",
          "bg-primary/10 border border-primary/20"
        )}>
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.username} <span className="text-muted-foreground">(Anda)</span>
            </p>
          </div>

          <div className="flex items-center gap-1">
            {isMuted && (
              <div className="p-1 rounded bg-destructive/10">
                <MicOff className="h-3.5 w-3.5 text-destructive" />
              </div>
            )}
            {isDeafened && (
              <div className="p-1 rounded bg-destructive/10">
                <HeadphoneOff className="h-3.5 w-3.5 text-destructive" />
              </div>
            )}
            {!isMuted && !isDeafened && (
              <div className="p-1">
                <Volume2 className="h-3.5 w-3.5 text-green-500" />
              </div>
            )}
          </div>
        </div>

        {/* Other participants */}
        {participants.map((participant) => (
          <div 
            key={participant.userId}
            className="flex items-center gap-3 p-2.5 rounded-md bg-muted/50"
          >
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={participant.avatar} />
                <AvatarFallback>{participant.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                participant.isDeafened ? "bg-muted-foreground" : "bg-green-500"
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{participant.username}</p>
            </div>

            <div className="flex items-center gap-1">
              {participant.isMuted && (
                <div className="p-1">
                  <MicOff className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              {participant.isDeafened && (
                <div className="p-1">
                  <HeadphoneOff className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              {!participant.isMuted && !participant.isDeafened && (
                <div className="p-1">
                  <Volume2 className="h-3.5 w-3.5 text-green-500" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
          onClick={toggleMute}
          className="h-10 w-10"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
        
        <Button
          variant={isDeafened ? "destructive" : "secondary"}
          size="icon"
          onClick={toggleDeafen}
          className="h-10 w-10"
          title={isDeafened ? "Undeafen" : "Deafen"}
        >
          {isDeafened ? (
            <HeadphoneOff className="h-5 w-5" />
          ) : (
            <Headphones className="h-5 w-5" />
          )}
        </Button>
        
        <Button
          variant="destructive"
          size="icon"
          onClick={leaveVoice}
          className="h-10 w-10"
          title="Disconnect"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

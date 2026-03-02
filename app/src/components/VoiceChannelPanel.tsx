import { useRef, useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Headphones, 
  HeadphoneOff, 
  PhoneOff,
  Volume2,
  Users,
  Radio,
  Monitor,
  MonitorStop,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useVoiceChannel } from '@/hooks/useVoiceChannel';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    toggleDeafen,
    // Screen share
    isScreenSharing,
    screenShareStream,
    remoteScreenShare,
    startScreenShare,
    stopScreenShare
  } = useVoiceChannel(channelId);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const screenShareVideoRef = useRef<HTMLVideoElement>(null);

  // Set screen share video stream
  const setScreenShareVideoRef = (element: HTMLVideoElement | null) => {
    if (element && remoteScreenShare?.stream) {
      element.srcObject = remoteScreenShare.stream;
    }
  };

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

  return (
    <TooltipProvider>
      <div className={cn(
        "flex flex-col rounded-lg border border-primary/10 overflow-hidden",
        isFullscreen ? "fixed inset-4 z-50 bg-background" : "bg-primary/5"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-primary/10">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radio className="h-4 w-4 text-green-500" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <span className="font-medium text-sm">{channelName}</span>
            
            {/* Screen share indicator */}
            {remoteScreenShare?.isActive && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 text-xs">
                <Monitor className="h-3 w-3" />
                <span className="hidden sm:inline">{remoteScreenShare.username} sedang berbagi layar</span>
                <span className="sm:hidden">Berbagi layar</span>
              </div>
            )}
            
            {isScreenSharing && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 text-xs">
                <Monitor className="h-3 w-3" />
                <span className="hidden sm:inline">Anda sedang berbagi layar</span>
                <span className="sm:hidden">Berbagi layar</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{participants.length + 1}</span>
          </div>
        </div>

        {/* Screen share video area */}
        {(remoteScreenShare?.isActive || isScreenSharing) && (
          <div className={cn(
            "relative bg-black/90 flex items-center justify-center",
            isFullscreen ? "flex-1" : "h-48 sm:h-64"
          )}>
            {/* Remote screen share video */}
            {remoteScreenShare?.isActive && remoteScreenShare.stream && (
              <video
                ref={setScreenShareVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            )}
            
            {/* Own screen share indicator */}
            {isScreenSharing && !remoteScreenShare?.isActive && (
              <div className="flex flex-col items-center justify-center text-white/60 space-y-2">
                <Monitor className="h-12 w-12" />
                <p className="text-sm">Layar Anda sedang dibagikan</p>
              </div>
            )}

            {/* Fullscreen toggle button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>

            {/* Screen share info overlay */}
            {remoteScreenShare?.isActive && (
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
                {remoteScreenShare.username} sedang berbagi layar
              </div>
            )}
          </div>
        )}

        {/* Participants */}
        <div className="p-3 space-y-2">
          {/* Self */}
          <div className={cn(
            "flex items-center gap-3 p-2.5 rounded-md transition-colors",
            "bg-primary/10 border border-primary/20"
          )}>
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>{(user?.displayName || user?.username)?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.displayName || user?.username} <span className="text-muted-foreground">(Anda)</span>
              </p>
            </div>

            <div className="flex items-center gap-1">
              {isScreenSharing && (
                <div className="p-1 rounded bg-blue-500/10">
                  <Monitor className="h-3.5 w-3.5 text-blue-500" />
                </div>
              )}
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
                {remoteScreenShare?.userId === participant.userId && (
                  <div className="p-1 rounded bg-green-500/10">
                    <Monitor className="h-3.5 w-3.5 text-green-500" />
                  </div>
                )}
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
        <div className="flex items-center justify-center gap-2 p-3 border-t border-primary/10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="icon"
                onClick={toggleMute}
                className="h-10 w-10"
              >
                {isMuted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isMuted ? "Bunyikan" : "Bisukan"}</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isDeafened ? "destructive" : "secondary"}
                size="icon"
                onClick={toggleDeafen}
                className="h-10 w-10"
              >
                {isDeafened ? (
                  <HeadphoneOff className="h-5 w-5" />
                ) : (
                  <Headphones className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isDeafened ? "Aktifkan audio" : "Matikan audio"}</p>
            </TooltipContent>
          </Tooltip>

          {/* Screen share button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isScreenSharing ? "default" : "secondary"}
                size="icon"
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                className={cn(
                  "h-10 w-10",
                  isScreenSharing && "bg-blue-500 hover:bg-blue-600"
                )}
                disabled={!!remoteScreenShare?.isActive && !isScreenSharing}
              >
                {isScreenSharing ? (
                  <MonitorStop className="h-5 w-5" />
                ) : (
                  <Monitor className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isScreenSharing 
                  ? "Hentikan berbagi layar" 
                  : remoteScreenShare?.isActive 
                    ? "Seseorang sedang berbagi layar" 
                    : "Bagikan layar"
                }
              </p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                onClick={leaveVoice}
                className="h-10 w-10"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Putuskan</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {error && (
          <p className="text-xs text-destructive text-center pb-2 px-3">{error}</p>
        )}
      </div>
    </TooltipProvider>
  );
}

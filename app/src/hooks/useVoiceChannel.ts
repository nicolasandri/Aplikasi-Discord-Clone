import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
type SimplePeerInstance = any;
import { useSocket } from './useSocket';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  VoiceParticipant, 
  VoiceChannelJoinedPayload, 
  UserJoinedVoicePayload,
  UserLeftVoicePayload,
  VoiceStateChangedPayload,
  SignalPayload,
  ScreenShareState,
  UserStartedScreenSharePayload,
  UserStoppedScreenSharePayload,
  ScreenShareSignalPayload,
  ScreenShareStartedPayload
} from '@/types/voice';

// ICE Servers configuration
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // TURN servers for production (configured via env)
    ...(import.meta.env.VITE_TURN_SERVER ? [{
      urls: import.meta.env.VITE_TURN_SERVER,
      username: import.meta.env.VITE_TURN_USERNAME || '',
      credential: import.meta.env.VITE_TURN_PASSWORD || ''
    }] : [])
  ]
};

export function useVoiceChannel(channelId: string | null) {
  const { socket, isConnected: isSocketConnected } = useSocket();
  const { user } = useAuth();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Screen share states
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [remoteScreenShare, setRemoteScreenShare] = useState<ScreenShareState | null>(null);
  const [screenShareStreamId, setScreenShareStreamId] = useState<string | null>(null);
  
  const peersRef = useRef<{ [key: string]: SimplePeerInstance }>({});
  const streamsRef = useRef<{ [key: string]: MediaStream }>({});
  const screenSharePeersRef = useRef<{ [key: string]: SimplePeerInstance }>({});
  const screenShareStreamsRef = useRef<{ [key: string]: MediaStream }>({});

  // Get local media stream
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2
        },
        video: false
      });
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error('Failed to get microphone access:', err);
      setError('Mohon izinkan akses microphone untuk voice chat');
      return null;
    }
  }, []);

  // Create peer connection
  const createPeer = useCallback((socketId: string, initiator: boolean, stream: MediaStream) => {
    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream,
      config: ICE_SERVERS
    });

    peer.on('signal', (signal: any) => {
      socket?.emit('signal', {
        to: socketId,
        signal,
        channelId
      });
    });

    peer.on('stream', (remoteStream) => {
      console.log('Received remote stream from:', socketId);
      streamsRef.current[socketId] = remoteStream;
      
      // Update participant with stream
      setParticipants(prev => 
        prev.map(p => 
          p.socketId === socketId ? { ...p, stream: remoteStream } : p
        )
      );
    });

    peer.on('connect', () => {
      console.log('Peer connected:', socketId);
    });

    peer.on('close', () => {
      console.log('Peer closed:', socketId);
      delete peersRef.current[socketId];
      delete streamsRef.current[socketId];
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
    });

    return peer;
  }, [socket, channelId]);

  // Create screen share peer connection
  const createScreenSharePeer = useCallback((socketId: string, initiator: boolean, stream: MediaStream) => {
    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream,
      config: ICE_SERVERS
    });

    peer.on('signal', (signal: any) => {
      socket?.emit('screen-share-signal', {
        to: socketId,
        signal,
        channelId,
        streamId: screenShareStreamId
      });
    });

    peer.on('stream', (remoteStream) => {
      console.log('Received screen share stream from:', socketId);
      screenShareStreamsRef.current[socketId] = remoteStream;
      
      // Find the participant to get their info
      const participant = participants.find(p => p.socketId === socketId);
      if (participant) {
        setRemoteScreenShare({
          userId: participant.userId,
          username: participant.username,
          streamId: `screen-${participant.userId}`,
          stream: remoteStream,
          isActive: true
        });
      }
    });

    peer.on('connect', () => {
      console.log('Screen share peer connected:', socketId);
    });

    peer.on('close', () => {
      console.log('Screen share peer closed:', socketId);
      delete screenSharePeersRef.current[socketId];
      delete screenShareStreamsRef.current[socketId];
    });

    peer.on('error', (err) => {
      console.error('Screen share peer error:', err);
    });

    return peer;
  }, [socket, channelId, screenShareStreamId, participants]);

  // Join voice channel
  const joinVoice = useCallback(async () => {
    if (!channelId || !socket || !isSocketConnected || !user) {
      setError('Tidak dapat bergabung ke voice channel');
      return;
    }

    // Reset state
    setError(null);

    // Get local stream
    const stream = await getLocalStream();
    if (!stream) return;

    // Join voice channel via socket
    socket.emit('join-voice-channel', { channelId });
  }, [channelId, socket, isSocketConnected, user, getLocalStream]);

  // Leave voice channel
  const leaveVoice = useCallback(() => {
    if (!socket || !channelId) return;

    // Stop screen sharing if active
    if (isScreenSharing) {
      stopScreenShare();
    }

    // Stop local stream
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);

    // Destroy all peer connections
    Object.values(peersRef.current).forEach(peer => peer.destroy());
    peersRef.current = {};
    streamsRef.current = {};

    // Destroy all screen share peer connections
    Object.values(screenSharePeersRef.current).forEach(peer => peer.destroy());
    screenSharePeersRef.current = {};
    screenShareStreamsRef.current = {};

    // Emit leave event
    socket.emit('leave-voice-channel', { channelId });

    // Reset state
    setIsConnected(false);
    setParticipants([]);
    setIsMuted(false);
    setIsDeafened(false);
    setRemoteScreenShare(null);
  }, [socket, channelId, localStream, isScreenSharing]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const newMutedState = !isMuted;
        audioTrack.enabled = !newMutedState;
        setIsMuted(newMutedState);
        
        // Notify server
        socket?.emit('voice-state-change', {
          channelId,
          isMuted: newMutedState,
          isDeafened
        });
      }
    }
  }, [localStream, isMuted, isDeafened, socket, channelId]);

  // Toggle deafen
  const toggleDeafen = useCallback(() => {
    const newDeafenedState = !isDeafened;
    setIsDeafened(newDeafenedState);
    
    // Mute/unmute all incoming audio
    Object.values(streamsRef.current).forEach(stream => {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !newDeafenedState;
      });
    });
    
    // Notify server
    socket?.emit('voice-state-change', {
      channelId,
      isMuted,
      isDeafened: newDeafenedState
    });
  }, [isMuted, isDeafened, socket, channelId]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    if (!channelId || !socket || !isConnected) {
      setError('Tidak dapat memulai screen sharing');
      return;
    }

    try {
      // Get screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      // Handle user stopping screen share via browser UI
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      setScreenShareStream(screenStream);
      setIsScreenSharing(true);

      // Notify server
      socket.emit('start-screen-share', { channelId });
    } catch (err: any) {
      console.error('Failed to start screen sharing:', err);
      setError('Gagal memulai screen sharing');
    }
  }, [channelId, socket, isConnected]);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (!socket || !channelId) return;

    // Stop screen share stream
    screenShareStream?.getTracks().forEach(track => track.stop());
    setScreenShareStream(null);
    setIsScreenSharing(false);
    setScreenShareStreamId(null);

    // Destroy screen share peer connections
    Object.values(screenSharePeersRef.current).forEach(peer => peer.destroy());
    screenSharePeersRef.current = {};
    screenShareStreamsRef.current = {};

    // Notify server
    socket.emit('stop-screen-share', { channelId });
  }, [socket, channelId, screenShareStream]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !channelId) return;

    // Successfully joined voice channel
    const handleVoiceChannelJoined = (data: VoiceChannelJoinedPayload) => {
      console.log('Joined voice channel:', data);
      setIsConnected(true);
      
      // Create peers for existing participants
      if (localStream && data.participants.length > 0) {
        data.participants.forEach((participant: any) => {
          if (participant.socketId && participant.userId !== user?.id) {
            const peer = createPeer(participant.socketId, true, localStream);
            peersRef.current[participant.socketId] = peer;
          }
        });
      }
    };

    // New user joined
    const handleUserJoinedVoice = (data: UserJoinedVoicePayload) => {
      console.log('User joined voice:', data);
      
      // Add to participants
      setParticipants(prev => [...prev, {
        userId: data.userId,
        username: data.username,
        avatar: data.avatar,
        isMuted: data.isMuted,
        isDeafened: data.isDeafened,
        socketId: data.socketId
      }]);

      // Create peer connection (we are not initiator since they just joined)
      if (localStream && data.socketId) {
        const peer = createPeer(data.socketId, false, localStream);
        peersRef.current[data.socketId] = peer;
      }
    };

    // User left
    const handleUserLeftVoice = (data: UserLeftVoicePayload) => {
      console.log('User left voice:', data);
      
      // Remove peer
      if (peersRef.current[data.socketId]) {
        peersRef.current[data.socketId].destroy();
        delete peersRef.current[data.socketId];
      }
      delete streamsRef.current[data.socketId];
      
      // Remove screen share peer if exists
      if (screenSharePeersRef.current[data.socketId]) {
        screenSharePeersRef.current[data.socketId].destroy();
        delete screenSharePeersRef.current[data.socketId];
      }
      delete screenShareStreamsRef.current[data.socketId];
      
      // Remove from participants
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
      
      // Clear remote screen share if the user who left was sharing
      setRemoteScreenShare(prev => {
        if (prev && prev.userId === data.userId) {
          return null;
        }
        return prev;
      });
    };

    // Voice state changed (mute/deafen)
    const handleVoiceStateChanged = (data: VoiceStateChangedPayload) => {
      console.log('Voice state changed:', data);
      setParticipants(prev => 
        prev.map(p => 
          p.userId === data.userId 
            ? { ...p, isMuted: data.isMuted, isDeafened: data.isDeafened }
            : p
        )
      );
    };

    // WebRTC signaling
    const handleSignal = (data: SignalPayload) => {
      console.log('Received signal from:', data.from);
      
      const peer = peersRef.current[data.from];
      if (peer) {
        peer.signal(data.signal);
      } else if (localStream) {
        // New peer, create connection
        const newPeer = createPeer(data.from, false, localStream);
        peersRef.current[data.from] = newPeer;
        newPeer.signal(data.signal);
      }
    };

    // Screen share started by current user
    const handleScreenShareStarted = (data: ScreenShareStartedPayload) => {
      console.log('Screen share started:', data);
      setScreenShareStreamId(data.streamId);

      // Create peer connections for screen share with all existing participants
      if (screenShareStream && participants.length > 0) {
        participants.forEach((participant) => {
          if (participant.socketId && participant.userId !== user?.id) {
            const peer = createScreenSharePeer(participant.socketId, true, screenShareStream);
            screenSharePeersRef.current[participant.socketId] = peer;
          }
        });
      }
    };

    // Another user started screen sharing
    const handleUserStartedScreenShare = (data: UserStartedScreenSharePayload) => {
      console.log('User started screen sharing:', data);
      
      // Find the participant
      const participant = participants.find(p => p.userId === data.userId);
      if (participant) {
        setRemoteScreenShare({
          userId: data.userId,
          username: data.username,
          streamId: data.streamId,
          isActive: true
        });
      }
    };

    // Another user stopped screen sharing
    const handleUserStoppedScreenShare = (data: UserStoppedScreenSharePayload) => {
      console.log('User stopped screen sharing:', data);
      
      setRemoteScreenShare(prev => {
        if (prev && prev.userId === data.userId) {
          return null;
        }
        return prev;
      });
    };

    // Screen share WebRTC signaling
    const handleScreenShareSignal = (data: ScreenShareSignalPayload) => {
      console.log('Received screen share signal from:', data.from);
      
      if (isScreenSharing) {
        // We are the sharer, handle incoming signals
        const peer = screenSharePeersRef.current[data.from];
        if (peer) {
          peer.signal(data.signal);
        } else if (screenShareStream) {
          // New peer wants to receive our screen share
          const newPeer = createScreenSharePeer(data.from, false, screenShareStream);
          screenSharePeersRef.current[data.from] = newPeer;
          newPeer.signal(data.signal);
        }
      } else {
        // We are the viewer, handle incoming signals
        const peer = screenSharePeersRef.current[data.from];
        if (peer) {
          peer.signal(data.signal);
        }
      }
    };

    // Error handling
    const handleVoiceError = (data: { message: string }) => {
      console.error('Voice error:', data);
      setError(data.message);
      // Don't disconnect on screen share errors
      if (!data.message.includes('screen')) {
        setIsConnected(false);
      }
    };

    socket.on('voice-channel-joined', handleVoiceChannelJoined);
    socket.on('user-joined-voice', handleUserJoinedVoice);
    socket.on('user-left-voice', handleUserLeftVoice);
    socket.on('voice-state-changed', handleVoiceStateChanged);
    socket.on('signal', handleSignal);
    socket.on('screen-share-started', handleScreenShareStarted);
    socket.on('user-started-screen-share', handleUserStartedScreenShare);
    socket.on('user-stopped-screen-share', handleUserStoppedScreenShare);
    socket.on('screen-share-signal', handleScreenShareSignal);
    socket.on('voice-error', handleVoiceError);

    return () => {
      socket.off('voice-channel-joined', handleVoiceChannelJoined);
      socket.off('user-joined-voice', handleUserJoinedVoice);
      socket.off('user-left-voice', handleUserLeftVoice);
      socket.off('voice-state-changed', handleVoiceStateChanged);
      socket.off('signal', handleSignal);
      socket.off('screen-share-started', handleScreenShareStarted);
      socket.off('user-started-screen-share', handleUserStartedScreenShare);
      socket.off('user-stopped-screen-share', handleUserStoppedScreenShare);
      socket.off('screen-share-signal', handleScreenShareSignal);
      socket.off('voice-error', handleVoiceError);
    };
  }, [socket, channelId, localStream, user?.id, createPeer, screenShareStream, isScreenSharing, createScreenSharePeer, participants]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveVoice();
    };
  }, [leaveVoice]);

  return {
    isConnected,
    isMuted,
    isDeafened,
    participants,
    localStream,
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
  };
}

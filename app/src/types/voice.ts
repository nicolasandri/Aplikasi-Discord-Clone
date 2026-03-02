/**
 * Voice Channel Types
 */

export interface VoiceParticipant {
  userId: string;
  username: string;
  avatar: string;
  isMuted: boolean;
  isDeafened: boolean;
  stream?: MediaStream;
  isSpeaking?: boolean;
  socketId?: string;
}

export interface VoiceChannelJoinedPayload {
  channelId: string;
  participants: VoiceParticipant[];
  isMuted: boolean;
  isDeafened: boolean;
}

export interface UserJoinedVoicePayload {
  userId: string;
  socketId: string;
  username: string;
  avatar: string;
  isMuted: boolean;
  isDeafened: boolean;
}

export interface UserLeftVoicePayload {
  userId: string;
  socketId: string;
}

export interface VoiceStateChangedPayload {
  userId: string;
  isMuted: boolean;
  isDeafened: boolean;
}

export interface SignalPayload {
  from: string;
  userId: string;
  username: string;
  signal: any;
  channelId: string;
}

export interface VoiceErrorPayload {
  message: string;
}

// Screen Sharing Types
export interface ScreenShareState {
  userId: string;
  username: string;
  streamId: string;
  stream?: MediaStream;
  isActive: boolean;
}

export interface StartScreenSharePayload {
  channelId: string;
}

export interface StopScreenSharePayload {
  channelId: string;
}

export interface UserStartedScreenSharePayload {
  userId: string;
  username: string;
  streamId: string;
}

export interface UserStoppedScreenSharePayload {
  userId: string;
  streamId: string;
}

export interface ScreenShareSignalPayload {
  from: string;
  userId: string;
  username: string;
  signal: any;
  channelId: string;
  streamId: string;
}

export interface ScreenShareStartedPayload {
  streamId: string;
  channelId: string;
}

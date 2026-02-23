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

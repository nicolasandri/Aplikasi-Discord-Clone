/// <reference types="node" />
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import type { Message } from '@/types';

// Always enable logging for debugging notifications
function log(...args: any[]) {
  console.log(...args);
}

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const SOCKET_URL = isElectron
  ? 'http://localhost:3001'
  : (import.meta.env.VITE_SOCKET_URL || window.location.origin);

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  sendMessage: (channelId: string, content: string, replyTo?: Message | null, attachments?: any[]) => void;
  sendTyping: (channelId: string) => void;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;
  deleteMessage: (messageId: string) => void;
  editMessage: (messageId: string, content: string) => void;
  typingUsers: { userId: string; username: string; channelId: string }[];
  userStatuses: Map<string, string>;
}

export function useSocket(
  onMessage?: (message: Message) => void,
  onReactionUpdate?: (data: { messageId: string; reactions: any[] }) => void,
  onMessageEdit?: (message: Message) => void,
  onMessageDelete?: (data: { messageId: string }) => void,
  onStatusChange?: (data: { userId: string; status: string }) => void,
  onMemberJoined?: (data: { userId: string; serverId: string; username: string; displayName?: string; avatar?: string }) => void
): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string; channelId: string }[]>([]);
  const [userStatuses, setUserStatuses] = useState<Map<string, string>>(new Map());
  const { token } = useAuth();
  // Track timeout IDs for cleanup
  const typingTimeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // BUG-FIX: Track last typing time to throttle
  // (moved above sendTyping)

  // BUG-020: Use ref for callbacks to prevent stale closure
  const callbacksRef = useRef({
    onMessage,
    onReactionUpdate,
    onMessageEdit,
    onMessageDelete,
    onStatusChange,
    onMemberJoined
  });

  // Update ref when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onMessage,
      onReactionUpdate,
      onMessageEdit,
      onMessageDelete,
      onStatusChange,
      onMemberJoined
    };
  }, [onMessage, onReactionUpdate, onMessageEdit, onMessageDelete, onStatusChange, onMemberJoined]);

  useEffect(() => {
    if (!token) return;

    console.log('🔌 useSocket: Initializing socket connection...');
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 useSocket: Socket connected:', socket.id);
      setIsConnected(true);
      socket.emit('authenticate', token);
      // Expose socket to window for DMChatArea and other components
      (window as any).socket = socket;
    });

    // Debug: Log ALL incoming events
    socket.onAny((eventName, ...args) => {
      console.log('🔌 Socket: Event received:', eventName, args?.[0]?.id || args?.[0]?.messageId || '');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    socket.on('auth_error', (error) => {
      console.error('Socket authentication error:', error);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socket.on('new_message', (message: Message) => {
      console.log('🔌 Socket: new_message', message.id);
      if (callbacksRef.current.onMessage) {
        callbacksRef.current.onMessage(message);
      }
    });

    // Listen for reaction updates
    socket.on('reaction_added', (data: { messageId: string; reactions: any[] }) => {
      console.log('🔌 Socket: reaction_added received', data);
      if (callbacksRef.current.onReactionUpdate) {
        callbacksRef.current.onReactionUpdate(data);
      }
    });

    socket.on('reaction_removed', (data: { messageId: string; reactions: any[] }) => {
      console.log('🔌 Socket: reaction_removed received', data);
      if (callbacksRef.current.onReactionUpdate) {
        callbacksRef.current.onReactionUpdate(data);
      }
    });

    socket.on('user_typing', (data: { userId: string; username: string; channelId: string }) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== data.userId);
        return [...filtered, data];
      });
      
      // Track timeout ID for cleanup
      const timeoutId = setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }, 3000);
      
      typingTimeoutIdsRef.current.push(timeoutId);
    });

    // Listen for message edits
    socket.on('message_edited', (message: Message) => {
      if (callbacksRef.current.onMessageEdit) {
        callbacksRef.current.onMessageEdit(message);
      }
    });

    // Listen for message deletions
    socket.on('message_deleted', (data: { messageId: string }) => {
      if (callbacksRef.current.onMessageDelete) {
        callbacksRef.current.onMessageDelete(data);
      }
    });

    // Listen for user status changes
    socket.on('user_status_changed', (data: { userId: string; status: string }) => {
      log('useSocket: User status changed:', data);
      setUserStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, data.status);
        return newMap;
      });
      if (callbacksRef.current.onStatusChange) {
        callbacksRef.current.onStatusChange(data);
      }
    });

    // Listen for member joined
    socket.on('member_joined', (data: { userId: string; serverId: string; username: string; displayName?: string; avatar?: string }) => {
      log('useSocket: Member joined:', data);
      if (callbacksRef.current.onMemberJoined) {
        callbacksRef.current.onMemberJoined(data);
      }
    });

    return () => {
      // Clear all typing timeouts
      typingTimeoutIdsRef.current.forEach(id => clearTimeout(id));
      typingTimeoutIdsRef.current = [];
      
      // Remove socket from window
      if ((window as any).socket === socket) {
        delete (window as any).socket;
      }
      
      // Disconnect socket
      socket.disconnect();
    };
  }, [token]); // BUG-020: Only depend on token, callbacks are accessed via ref

  const joinChannel = useCallback((channelId: string) => {
    console.log('🔌 Socket: Joining channel:', channelId);
    if (socketRef.current) {
      socketRef.current.emit('join_channel', channelId);
    }
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    console.log('🔌 Socket: Leaving channel:', channelId);
    if (socketRef.current) {
      socketRef.current.emit('leave_channel', channelId);
    }
  }, []);

  const sendMessage = useCallback((channelId: string, content: string, replyTo?: Message | null, attachments?: any[]) => {
    console.log('🔌 Socket: Sending message to channel:', channelId, 'Content:', content?.substring(0, 30));
    if (socketRef.current) {
      socketRef.current.emit('send_message', { channelId, content, replyTo, attachments });
      console.log('🔌 Socket: send_message emitted');
    } else {
      console.error('🔌 Socket: Cannot send message, socket not connected');
    }
  }, []);

  // BUG-FIX: Throttle typing to avoid rate limit
  const lastTypingRef = useRef<number>(0);
  const TYPING_THROTTLE_MS = 2000; // Only send typing every 2 seconds
  
  const sendTyping = useCallback((channelId: string) => {
    if (socketRef.current) {
      const now = Date.now();
      if (now - lastTypingRef.current > TYPING_THROTTLE_MS) {
        socketRef.current.emit('typing', { channelId });
        lastTypingRef.current = now;
      }
    }
  }, []);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    if (socketRef.current) {
      socketRef.current.emit('add_reaction', { messageId, emoji });
    }
  }, []);

  const removeReaction = useCallback((messageId: string, emoji: string) => {
    if (socketRef.current) {
      socketRef.current.emit('remove_reaction', { messageId, emoji });
    }
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('delete_message', { messageId });
    }
  }, []);

  const editMessage = useCallback((messageId: string, content: string) => {
    if (socketRef.current) {
      socketRef.current.emit('edit_message', { messageId, content });
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinChannel,
    leaveChannel,
    sendMessage,
    sendTyping,
    addReaction,
    removeReaction,
    deleteMessage,
    editMessage,
    typingUsers,
    userStatuses,
  };
}

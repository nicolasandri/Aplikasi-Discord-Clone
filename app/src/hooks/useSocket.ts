import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import type { Message } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const SOCKET_URL = isElectron 
  ? 'http://localhost:3001' 
  : (import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001');

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  sendMessage: (channelId: string, content: string, replyTo?: Message | null) => void;
  sendTyping: (channelId: string) => void;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;
  deleteMessage: (messageId: string) => void;
  editMessage: (messageId: string, content: string) => void;
  typingUsers: { userId: string; username: string; channelId: string }[];
}

export function useSocket(
  onMessage?: (message: Message) => void,
  onReactionUpdate?: (data: { messageId: string; reactions: any[] }) => void,
  onMessageEdit?: (message: Message) => void,
  onMessageDelete?: (data: { messageId: string }) => void
): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string; channelId: string }[]>([]);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      socket.emit('authenticate', token);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('new_message', (message: Message) => {
      if (onMessage) {
        onMessage(message);
      }
    });

    // Listen for reaction updates
    socket.on('reaction_added', (data: { messageId: string; reactions: any[] }) => {
      console.log('Reaction added:', data);
      if (onReactionUpdate) {
        onReactionUpdate(data);
      }
    });

    socket.on('reaction_removed', (data: { messageId: string; reactions: any[] }) => {
      console.log('Reaction removed:', data);
      if (onReactionUpdate) {
        onReactionUpdate(data);
      }
    });

    socket.on('user_typing', (data: { userId: string; username: string; channelId: string }) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== data.userId);
        return [...filtered, data];
      });
      
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }, 3000);
    });

    // Listen for message edits
    socket.on('message_edited', (message: Message) => {
      console.log('Message edited:', message);
      if (onMessageEdit) {
        onMessageEdit(message);
      }
    });

    // Listen for message deletions
    socket.on('message_deleted', (data: { messageId: string }) => {
      console.log('Message deleted:', data);
      if (onMessageDelete) {
        onMessageDelete(data);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, onMessage, onReactionUpdate, onMessageEdit, onMessageDelete]);

  const joinChannel = useCallback((channelId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join_channel', channelId);
    }
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave_channel', channelId);
    }
  }, []);

  const sendMessage = useCallback((channelId: string, content: string, replyTo?: Message | null, attachments?: any[]) => {
    if (socketRef.current) {
      socketRef.current.emit('send_message', { channelId, content, replyTo, attachments });
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

  const sendTyping = useCallback((channelId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('typing', { channelId });
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
  };
}

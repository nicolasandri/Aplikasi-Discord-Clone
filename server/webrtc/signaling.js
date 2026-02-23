/**
 * WebRTC Voice Signaling Server
 * Handles peer-to-peer connection establishment via Socket.IO
 */

const { voiceDB, permissionDB, Permissions } = require('../database-postgres');

class VoiceSignalingServer {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // channelId -> Map(userId -> socketId)
    this.socketToUser = new Map(); // socketId -> { userId, channelId }
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔌 Client connected for voice:', socket.id);
      
      // Join voice channel
      socket.on('join-voice-channel', async (data) => {
        await this.handleJoinVoiceChannel(socket, data);
      });
      
      // WebRTC signaling
      socket.on('signal', async (data) => {
        await this.handleSignal(socket, data);
      });
      
      // Voice state updates (mute/deafen)
      socket.on('voice-state-change', async (data) => {
        await this.handleVoiceStateChange(socket, data);
      });
      
      // Leave voice channel
      socket.on('leave-voice-channel', async (data) => {
        await this.handleLeaveVoiceChannel(socket, data);
      });
      
      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  async handleJoinVoiceChannel(socket, { channelId }) {
    try {
      const userId = socket.userId;
      if (!userId) {
        socket.emit('voice-error', { message: 'Not authenticated' });
        return;
      }

      // Check if channel exists and user has permission
      const channel = await voiceDB.getVoiceChannelWithPermission(channelId, userId);
      if (!channel) {
        socket.emit('voice-error', { message: 'Channel not found or no permission' });
        return;
      }

      // Check CONNECT permission for voice
      const canConnect = await permissionDB.hasPermission(userId, channel.server_id, Permissions.CONNECT);
      if (!canConnect) {
        socket.emit('voice-error', { message: 'No permission to join voice channel' });
        return;
      }

      // Leave any existing voice channel first
      const existingChannel = await voiceDB.getUserVoiceChannel(userId);
      if (existingChannel && existingChannel.channel_id !== channelId) {
        await this.removeFromVoiceChannel(socket, existingChannel.channel_id);
      }

      // Join room
      socket.join(`voice:${channelId}`);
      
      // Track in memory
      if (!this.rooms.has(channelId)) {
        this.rooms.set(channelId, new Map());
      }
      this.rooms.get(channelId).set(userId, socket.id);
      this.socketToUser.set(socket.id, { userId, channelId });
      
      // Save to database
      await voiceDB.joinVoiceChannel(channelId, userId);
      
      // Get existing participants (with their voice state)
      const participants = await voiceDB.getVoiceParticipants(channelId);
      
      // Log event
      await voiceDB.logSignalingEvent(channelId, userId, 'join', { socketId: socket.id });
      
      // Get user info
      const { userDB } = require('../database-postgres');
      const user = await userDB.findById(userId);
      
      // Notify others that new user joined
      socket.to(`voice:${channelId}`).emit('user-joined-voice', {
        userId,
        socketId: socket.id,
        username: user?.username,
        avatar: user?.avatar,
        isMuted: false,
        isDeafened: false
      });
      
      // Send existing participants to new user
      socket.emit('voice-channel-joined', {
        channelId,
        participants: participants
          .filter(p => p.user_id !== userId)
          .map(p => ({
            userId: p.user_id,
            username: p.username,
            avatar: p.avatar,
            isMuted: p.is_muted,
            isDeafened: p.is_deafened
          })),
        isMuted: false,
        isDeafened: false
      });
      
      console.log(`🎤 User ${user?.username} (${userId}) joined voice channel ${channelId}`);
    } catch (error) {
      console.error('❌ Error joining voice channel:', error);
      socket.emit('voice-error', { message: 'Failed to join voice channel' });
    }
  }

  async handleSignal(socket, { to, signal, channelId }) {
    try {
      const userId = socket.userId;
      if (!userId) return;

      // Verify user is in the channel
      const isInChannel = await voiceDB.isUserInVoiceChannel(channelId, userId);
      if (!isInChannel) {
        socket.emit('voice-error', { message: 'Not in voice channel' });
        return;
      }

      // Get user info
      const { userDB } = require('../database-postgres');
      const user = await userDB.findById(userId);

      // Forward signal to target peer
      this.io.to(to).emit('signal', {
        from: socket.id,
        userId,
        username: user?.username,
        signal,
        channelId
      });

      // Log signaling event (optional, for debugging)
      // await voiceDB.logSignalingEvent(channelId, userId, 'signal', { to, type: signal.type });
    } catch (error) {
      console.error('❌ Error handling signal:', error);
    }
  }

  async handleVoiceStateChange(socket, { channelId, isMuted, isDeafened }) {
    try {
      const userId = socket.userId;
      if (!userId) return;
      
      // Verify user is in the channel
      const isInChannel = await voiceDB.isUserInVoiceChannel(channelId, userId);
      if (!isInChannel) return;
      
      // Update database
      await voiceDB.updateVoiceState(channelId, userId, { isMuted, isDeafened });
      
      // Log event
      await voiceDB.logSignalingEvent(channelId, userId, 'state-change', { isMuted, isDeafened });
      
      // Broadcast to room
      this.io.to(`voice:${channelId}`).emit('voice-state-changed', {
        userId,
        isMuted,
        isDeafened
      });
      
      console.log(`🔇 User ${userId} state changed: muted=${isMuted}, deafened=${isDeafened}`);
    } catch (error) {
      console.error('❌ Error updating voice state:', error);
    }
  }

  async handleLeaveVoiceChannel(socket, { channelId }) {
    await this.removeFromVoiceChannel(socket, channelId);
  }

  async handleDisconnect(socket) {
    const userData = this.socketToUser.get(socket.id);
    if (userData) {
      await this.removeFromVoiceChannel(socket, userData.channelId);
    }
  }

  async removeFromVoiceChannel(socket, channelId) {
    try {
      const userData = this.socketToUser.get(socket.id);
      const userId = userData?.userId || socket.userId;
      
      if (!userId) return;
      
      // Leave room
      socket.leave(`voice:${channelId}`);
      
      // Remove from memory tracking
      if (this.rooms.has(channelId)) {
        this.rooms.get(channelId).delete(userId);
        if (this.rooms.get(channelId).size === 0) {
          this.rooms.delete(channelId);
        }
      }
      
      this.socketToUser.delete(socket.id);
      
      // Remove from database
      await voiceDB.leaveVoiceChannel(channelId, userId);
      
      // Log event
      await voiceDB.logSignalingEvent(channelId, userId, 'leave', { socketId: socket.id });
      
      // Notify others
      socket.to(`voice:${channelId}`).emit('user-left-voice', {
        userId,
        socketId: socket.id
      });
      
      console.log(`👋 User ${userId} left voice channel ${channelId}`);
    } catch (error) {
      console.error('❌ Error removing from voice channel:', error);
    }
  }

  // Get socket ID for a user in a specific channel
  getSocketIdForUser(channelId, userId) {
    if (!this.rooms.has(channelId)) return null;
    return this.rooms.get(channelId).get(userId) || null;
  }

  // Get all participants in a channel (for admin/debugging)
  getChannelParticipants(channelId) {
    if (!this.rooms.has(channelId)) return [];
    return Array.from(this.rooms.get(channelId).entries());
  }
}

module.exports = VoiceSignalingServer;

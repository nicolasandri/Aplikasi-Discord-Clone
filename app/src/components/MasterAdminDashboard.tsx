import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Server, 
  MessageSquare, 
  BarChart3, 
  Shield, 
  Search,
  Trash2,
  Crown,
  LogOut,
  Hash,
  Calendar,
  ArrowRight,
  RefreshCw,
  Copy,
  UserCheck,
  UserX,
  Plus,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface UserWithDetails {
  id: string;
  username: string;
  email: string;
  password: string;
  avatar: string;
  status: string;
  displayName: string;
  isMasterAdmin: boolean;
  isActive: boolean;
  lastLogin: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  serverCount: number;
  messageCount: number;
  joinedViaGroupCode: string | null;
}

interface ServerWithDetails {
  id: string;
  name: string;
  icon: string;
  ownerId: string;
  ownerUsername: string;
  createdAt: string;
  memberCount: number;
  channelCount: number;
  messageCount: number;
}

interface MessageWithDetails {
  id: string;
  channelId: string;
  channelName: string;
  serverId: string;
  serverName: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  content: string;
  createdAt: string;
  attachments?: any[];
}

interface DMMessageWithDetails {
  id: string;
  channelId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatar: string;
  recipientId: string;
  recipientUsername: string;
  recipientDisplayName: string;
  recipientAvatar: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  attachments?: any[];
}

interface DMConversation {
  id: string; // channel id
  participant1: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    status: string;
  };
  participant2: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    status: string;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  messages: DMMessageWithDetails[];
  unreadCount: number;
}

interface Statistics {
  total_users: number;
  total_servers: number;
  total_channels: number;
  total_messages: number;
  total_dm_messages: number;
  total_memberships: number;
  total_friendships: number;
  online_users: number;
  total_jeboltogel_users: number;
}

export function MasterAdminDashboard() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<Statistics | null>(null);
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [servers, setServers] = useState<ServerWithDetails[]>([]);
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [dmMessages, setDmMessages] = useState<DMMessageWithDetails[]>([]);
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<DMConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showOnlyJebolTogel, setShowOnlyJebolTogel] = useState(true); // Default filter JEBOLTOGEL
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'user' | 'server', id: string, name: string } | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string, name: string } | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [showResetResult, setShowResetResult] = useState(false);
  
  // Group Code Management
  const [groupCodes, setGroupCodes] = useState<any[]>([]);
  const [createGroupCodeDialogOpen, setCreateGroupCodeDialogOpen] = useState(false);
  const [newGroupCode, setNewGroupCode] = useState({ code: '', serverId: '', maxUses: '' });
  
  // Default Channel Management
  const [defaultChannelDialogOpen, setDefaultChannelDialogOpen] = useState(false);
  const [selectedGroupCode, setSelectedGroupCode] = useState<any>(null);
  const [groupCodeChannels, setGroupCodeChannels] = useState<any[]>([]);
  const [selectedDefaultChannel, setSelectedDefaultChannel] = useState<string>('');
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  
  // Server Access Management
  const [serverAccessData, setServerAccessData] = useState<any[]>([]);
  const [serverAccessServers, setServerAccessServers] = useState<any[]>([]);
  const [selectedAccessServer, setSelectedAccessServer] = useState<any>(null);
  const [serverMembersAccess, setServerMembersAccess] = useState<any[]>([]);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);

  useEffect(() => {
    if (token) {
      fetchStatistics();
      fetchUsers();
      fetchServers();
      fetchDMMessages();
      fetchGroupCodes();
    }
  }, [token]);

  // Fetch group codes when tab changes to groupcodes
  useEffect(() => {
    if (token && activeTab === 'groupcodes') {
      fetchGroupCodes();
    }
  }, [token, activeTab]);

  // Fetch server access data when tab changes to channelaccess
  useEffect(() => {
    if (token && activeTab === 'channelaccess') {
      fetchServerAccessData();
    }
  }, [token, activeTab]);

  const fetchStatistics = async () => {
    try {
      console.log('Fetching stats with token:', token?.substring(0, 20) + '...');
      const response = await fetch(`${API_URL}/admin/stats`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      console.log('Stats response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401) {
        toast.error('Sesi login habis. Silakan login ulang.');
        logout();
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log('Fetching users with token:', token?.substring(0, 20) + '...');
      const response = await fetch(`${API_URL}/admin/users?limit=100`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      console.log('Users response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Users data sample:', data.users.slice(0, 2).map((u: any) => ({ 
          username: u.username, 
          joinedViaGroupCode: u.joinedViaGroupCode 
        })));
        setUsers(data.users);
      } else if (response.status === 401) {
        toast.error('Sesi login habis. Silakan login ulang.');
        logout();
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  };

  const fetchServers = async () => {
    try {
      console.log('Fetching servers with token:', token?.substring(0, 20) + '...');
      const response = await fetch(`${API_URL}/admin/servers?limit=100`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      console.log('Servers response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        setServers(data.servers);
      } else if (response.status === 401) {
        toast.error('Sesi login habis. Silakan login ulang.');
        logout();
      }
    } catch (error) {
      console.error('Error fetching servers:', error);
      toast.error('Gagal memuat data server');
    }
  };

  const fetchDMMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/dm-messages?limit=200`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      console.log('DM Messages response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        setDmMessages(data.messages);
        // Group messages into conversations
        const grouped = groupMessagesIntoConversations(data.messages);
        setConversations(grouped);
      } else if (response.status === 401) {
        toast.error('Sesi login habis. Silakan login ulang.');
        logout();
      }
    } catch (error) {
      console.error('Error fetching DM messages:', error);
      toast.error('Gagal memuat data pesan DM');
    } finally {
      setLoading(false);
    }
  };

  // Group DM messages into conversations
  const groupMessagesIntoConversations = (messages: DMMessageWithDetails[]): DMConversation[] => {
    const conversationMap = new Map<string, DMConversation>();
    
    messages.forEach(msg => {
      const key = msg.channelId;
      
      if (!conversationMap.has(key)) {
        // Create new conversation
        conversationMap.set(key, {
          id: msg.channelId,
          participant1: {
            id: msg.senderId,
            username: msg.senderUsername,
            displayName: msg.senderDisplayName,
            avatar: msg.senderAvatar,
            status: 'offline'
          },
          participant2: {
            id: msg.recipientId,
            username: msg.recipientUsername,
            displayName: msg.recipientDisplayName,
            avatar: msg.recipientAvatar,
            status: 'offline'
          },
          messages: [],
          unreadCount: 0
        });
      }
      
      const conv = conversationMap.get(key)!;
      conv.messages.push(msg);
      
      if (!msg.isRead) {
        conv.unreadCount++;
      }
    });
    
    // Sort messages in each conversation by date and set last message
    conversationMap.forEach(conv => {
      conv.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const lastMsg = conv.messages[conv.messages.length - 1];
      if (lastMsg) {
        conv.lastMessage = {
          content: lastMsg.content,
          createdAt: lastMsg.createdAt,
          senderId: lastMsg.senderId
        };
      }
    });
    
    // Convert to array and sort by last message date (newest first)
    return Array.from(conversationMap.values()).sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  };

  // Format date for chat (today, yesterday, or date)
  const formatChatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date >= today) {
      return 'Hari ini';
    } else if (date >= yesterday) {
      return 'Kemarin';
    } else {
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  // Format time for chat
  const formatChatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get avatar with fallback - handle relative paths
  const getAvatar = (avatar: string | null | undefined, seed: string) => {
    if (avatar && avatar.trim() !== '') {
      // If it's already a full URL, return as is
      if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) {
        return avatar;
      }
      // If it's a relative path starting with /uploads or /api, prepend server URL
      if (avatar.startsWith('/uploads/') || avatar.startsWith('/api/')) {
        // Remove /api prefix if present
        const cleanPath = avatar.startsWith('/api/') ? avatar.substring(4) : avatar;
        return `http://localhost:3001${cleanPath}`;
      }
      return avatar;
    }
    // Return dicebear avatar as fallback
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  };

  const fetchMessages = async (serverId?: string, channelId?: string) => {
    setLoading(true);
    try {
      let url = `${API_URL}/admin/messages?limit=100`;
      if (serverId) url += `&serverId=${serverId}`;
      if (channelId) url += `&channelId=${channelId}`;
      
      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      } else if (response.status === 401) {
        toast.error('Sesi login habis. Silakan login ulang.');
        logout();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Gagal memuat data pesan');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Pengguna berhasil dihapus');
        fetchUsers();
        fetchStatistics();
      } else {
        toast.error('Gagal menghapus pengguna');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menghapus pengguna');
    }
    setDeleteDialogOpen(false);
  };

  const handleDeleteServer = async (serverId: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/servers/${serverId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Server berhasil dihapus');
        fetchServers();
        fetchStatistics();
      } else {
        toast.error('Gagal menghapus server');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menghapus server');
    }
    setDeleteDialogOpen(false);
  };

  const handleSetMasterAdmin = async (userId: string, isMasterAdmin: boolean) => {
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/master-admin`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isMasterAdmin }),
      });
      if (response.ok) {
        toast.success(isMasterAdmin ? 'Master Admin berhasil ditambahkan' : 'Master Admin berhasil dihapus');
        fetchUsers();
      } else {
        toast.error('Gagal mengubah status Master Admin');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const openDeleteDialog = (type: 'user' | 'server', id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'user') {
      handleDeleteUser(deleteTarget.id);
    } else {
      handleDeleteServer(deleteTarget.id);
    }
  };

  // Generate random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const openResetPasswordDialog = (userId: string, username: string) => {
    setResetPasswordTarget({ id: userId, name: username });
    setTempPassword(generateRandomPassword()); // Auto-generate random password
    setShowResetResult(false);
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordTarget || !tempPassword) return;
    
    if (tempPassword.length < 6) {
      toast.error('Password sementara minimal 6 karakter');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/admin/users/${resetPasswordTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tempPassword })
      });
      
      if (response.ok) {
        setShowResetResult(true);
        toast.success('Password berhasil direset');
        fetchUsers(); // Refresh user list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal mereset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Terjadi kesalahan saat mereset password');
    }
  };

  const handleToggleUserActive = async (userId: string, username: string, isActive: boolean) => {
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/toggle-active`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      });
      
      if (response.ok) {
        toast.success(isActive ? `User ${username} diaktifkan` : `User ${username} dinonaktifkan`);
        fetchUsers(); // Refresh user list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal mengubah status user');
      }
    } catch (error) {
      console.error('Toggle user active error:', error);
      toast.error('Terjadi kesalahan saat mengubah status user');
    }
  };

  // Fetch group codes
  const fetchGroupCodes = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/group-codes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGroupCodes(data.groupCodes);
      }
    } catch (error) {
      console.error('Error fetching group codes:', error);
    }
  };

  // Create group code
  const handleCreateGroupCode = async () => {
    if (!newGroupCode.code || !newGroupCode.serverId) {
      toast.error('Kode dan Server harus diisi');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/admin/group-codes`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: newGroupCode.code.toUpperCase(),
          serverId: newGroupCode.serverId,
          maxUses: newGroupCode.maxUses ? parseInt(newGroupCode.maxUses) : null
        })
      });
      
      if (response.ok) {
        toast.success('Kode grup berhasil dibuat');
        setNewGroupCode({ code: '', serverId: '', maxUses: '' });
        setCreateGroupCodeDialogOpen(false);
        fetchGroupCodes();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal membuat kode grup');
      }
    } catch (error) {
      console.error('Create group code error:', error);
      toast.error('Terjadi kesalahan saat membuat kode grup');
    }
  };

  // Delete group code
  const handleDeleteGroupCode = async (codeId: string) => {
    if (!confirm('Anda yakin ingin menghapus kode grup ini?')) return;
    
    try {
      const response = await fetch(`${API_URL}/admin/group-codes/${codeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        toast.success('Kode grup berhasil dihapus');
        fetchGroupCodes();
      } else {
        toast.error('Gagal menghapus kode grup');
      }
    } catch (error) {
      console.error('Delete group code error:', error);
      toast.error('Terjadi kesalahan saat menghapus kode grup');
    }
  };

  // Open default channel dialog
  const openDefaultChannelDialog = async (groupCode: any) => {
    setSelectedGroupCode(groupCode);
    setDefaultChannelDialogOpen(true);
    setIsLoadingChannels(true);
    
    try {
      const response = await fetch(`${API_URL}/admin/group-codes/${groupCode.id}/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setGroupCodeChannels(data.channels);
        setSelectedDefaultChannel(data.defaultChannelId || '');
      } else {
        toast.error('Gagal memuat daftar channel');
      }
    } catch (error) {
      console.error('Fetch channels error:', error);
      toast.error('Terjadi kesalahan saat memuat channel');
    } finally {
      setIsLoadingChannels(false);
    }
  };

  // Update default channel
  const handleUpdateDefaultChannel = async () => {
    if (!selectedGroupCode) return;
    
    try {
      const response = await fetch(`${API_URL}/admin/group-codes/${selectedGroupCode.id}/default-channel`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          defaultChannelId: selectedDefaultChannel || null 
        })
      });
      
      if (response.ok) {
        toast.success('Channel default berhasil diupdate');
        setDefaultChannelDialogOpen(false);
        fetchGroupCodes(); // Refresh group codes list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal mengupdate channel default');
      }
    } catch (error) {
      console.error('Update default channel error:', error);
      toast.error('Terjadi kesalahan saat mengupdate channel default');
    }
  };

  // Debug: log all users with their group codes
  console.log('All users with joinedViaGroupCode:', users.map(u => ({ 
    username: u.username, 
    code: u.joinedViaGroupCode 
  })));

  // Fetch server access data (all users with their server access)
  const fetchServerAccessData = async () => {
    setIsLoadingAccess(true);
    try {
      const response = await fetch(`${API_URL}/admin/server-access/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setServerAccessData(data.users);
        setServerAccessServers(data.servers);
      }
    } catch (error) {
      console.error('Error fetching server access data:', error);
    } finally {
      setIsLoadingAccess(false);
    }
  };

  // Fetch server members with server access
  const fetchServerMembersAccess = async (serverId: string) => {
    setIsLoadingAccess(true);
    try {
      const response = await fetch(`${API_URL}/admin/servers/${serverId}/members/server-access`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setServerMembersAccess(data.members);
        setSelectedAccessServer(data.server);
      }
    } catch (error) {
      console.error('Error fetching server members access:', error);
    } finally {
      setIsLoadingAccess(false);
    }
  };

  // Toggle server access for a user
  const toggleServerAccess = async (userId: string, serverId: string, isAllowed: boolean) => {
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/servers/${serverId}/access`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isAllowed })
      });
      
      if (response.ok) {
        toast.success(`Akses server ${isAllowed ? 'diberikan' : 'ditolak'}`);
        // Refresh data
        if (selectedAccessServer) {
          fetchServerMembersAccess(selectedAccessServer.id);
        } else {
          fetchServerAccessData();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal mengupdate akses');
      }
    } catch (error) {
      console.error('Toggle server access error:', error);
      toast.error('Terjadi kesalahan saat mengupdate akses');
    }
  };
  
  const filteredUsers = users.filter(u => {
    // Filter by search query
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by JEBOLTOGEL code
    const matchesJebolTogel = showOnlyJebolTogel 
      ? u.joinedViaGroupCode === 'JEBOLTOGEL'
      : true;
    
    return matchesSearch && matchesJebolTogel;
  });

  const filteredServers = servers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.ownerUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user?.isMasterAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#313338]">
        <Card className="w-96 bg-[#2B2D31] border-[#1E1F22]">
          <CardHeader>
            <CardTitle className="text-white text-center">Akses Ditolak</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <p className="text-[#B5BAC1] mb-4">
              Anda tidak memiliki akses ke halaman ini. Hanya Master Admin yang dapat mengakses dashboard ini.
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#313338] flex flex-col">
      {/* Header */}
      <div className="bg-[#2B2D31] border-b border-[#1E1F22] p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-[#5865F2] p-2 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Master Admin Dashboard</h1>
              <p className="text-sm text-[#B5BAC1]">Kelola semua data WorkGrid</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-[#5865F2] text-[#5865F2]">
              <Crown className="w-3 h-3 mr-1" />
              {user.username}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                fetchStatistics();
                fetchUsers();
                fetchServers();
                fetchDMMessages();
                fetchGroupCodes();
                toast.success('Data berhasil direfresh');
              }}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full p-6 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="bg-[#2B2D31] border-b border-[#1E1F22] w-full justify-start rounded-none h-12">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#404249]">
              <BarChart3 className="w-4 h-4 mr-2" />
              Ikhtisar
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[#404249]">
              <Users className="w-4 h-4 mr-2" />
              Pengguna ({stats?.total_users || 0})
            </TabsTrigger>
            <TabsTrigger value="servers" className="data-[state=active]:bg-[#404249]">
              <Server className="w-4 h-4 mr-2" />
              Server ({stats?.total_servers || 0})
            </TabsTrigger>
            <TabsTrigger value="groupcodes" className="data-[state=active]:bg-[#404249]">
              <Users className="w-4 h-4 mr-2" />
              Kode Grup
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-[#404249]">
              <MessageSquare className="w-4 h-4 mr-2" />
              Pesan ({stats?.total_messages || 0})
            </TabsTrigger>
            <TabsTrigger value="channelaccess" className="data-[state=active]:bg-[#404249]" onClick={() => fetchServerAccessData()}>
              <Server className="w-4 h-4 mr-2" />
              Akses Server
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 mt-0 overflow-hidden data-[state=inactive]:hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-[#2B2D31] border-[#1E1F22]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[#B5BAC1]">Total Pengguna</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-white">{stats?.total_users || 0}</span>
                    <Users className="w-8 h-8 text-[#5865F2]" />
                  </div>
                  <p className="text-xs text-[#23A559] mt-2">
                    {stats?.online_users || 0} online
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#2B2D31] border-[#1E1F22]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[#B5BAC1]">Total Server</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-white">{stats?.total_servers || 0}</span>
                    <Server className="w-8 h-8 text-[#5865F2]" />
                  </div>
                  <p className="text-xs text-[#B5BAC1] mt-2">
                    {stats?.total_channels || 0} channel
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#2B2D31] border-[#1E1F22]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[#B5BAC1]">Total Pesan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-white">
                      {(stats?.total_messages || 0) + (stats?.total_dm_messages || 0)}
                    </span>
                    <MessageSquare className="w-8 h-8 text-[#5865F2]" />
                  </div>
                  <p className="text-xs text-[#B5BAC1] mt-2">
                    {stats?.total_dm_messages || 0} DM
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#2B2D31] border-[#1E1F22]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[#B5BAC1]">JEBOLTOGEL Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-white">{stats?.total_jeboltogel_users || 0}</span>
                    <Hash className="w-8 h-8 text-[#5865F2]" />
                  </div>
                  <p className="text-xs text-[#B5BAC1] mt-2">
                    dari {stats?.total_users || 0} total pengguna
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="flex-1 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B5BAC1]" />
                <Input
                  placeholder="Cari pengguna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#1E1F22] border-[#2B2D31] text-white"
                />
              </div>
              
              {/* Filter JEBOLTOGEL Toggle */}
              <div 
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  showOnlyJebolTogel 
                    ? 'bg-[#5865F2]/20 border border-[#5865F2] text-[#5865F2]' 
                    : 'bg-[#2B2D31] border border-[#2B2D31] text-[#B5BAC1] hover:bg-[#35373C]'
                }`}
                onClick={() => setShowOnlyJebolTogel(!showOnlyJebolTogel)}
                title={showOnlyJebolTogel ? 'Tampilkan semua user' : 'Filter hanya JEBOLTOGEL'}
              >
                <Hash className="w-4 h-4" />
                <span className="text-sm font-medium">JEBOLTOGEL</span>
                {showOnlyJebolTogel && (
                  <Badge className="bg-[#5865F2] text-white text-xs px-1.5 py-0 ml-1">
                    {filteredUsers.length}
                  </Badge>
                )}
              </div>
              
              <Button onClick={fetchUsers} variant="outline">
                Refresh
              </Button>
            </div>

            <div className="flex-1 overflow-auto rounded-lg border border-[#2B2D31]">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2B2D31] bg-[#2B2D31] hover:bg-[#2B2D31]">
                    <TableHead className="text-[#B5BAC1] w-[220px]">Pengguna</TableHead>
                    <TableHead className="text-[#B5BAC1] w-[180px]">Kontak</TableHead>
                    <TableHead className="text-[#B5BAC1] w-[90px] text-center">Statistik</TableHead>
                    <TableHead className="text-[#B5BAC1] w-[120px]">Kode Grup</TableHead>
                    <TableHead className="text-[#B5BAC1] w-[150px]">Login Terakhir</TableHead>
                    <TableHead className="text-[#B5BAC1] w-[100px]">Bergabung</TableHead>
                    <TableHead className="text-[#B5BAC1] w-[120px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userItem) => (
                    <TableRow key={userItem.id} className={`border-[#2B2D31] hover:bg-[#35373C] ${!userItem.isActive ? 'opacity-50' : ''}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img 
                            src={getAvatar(userItem.avatar, userItem.username)} 
                            alt={userItem.username}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p className="text-white font-medium text-sm">{userItem.displayName || userItem.username}</p>
                            <p className="text-[#B5BAC1] text-xs">@{userItem.username}</p>
                            <div className="flex gap-1 mt-1">
                              {userItem.isMasterAdmin && (
                                <Badge className="bg-[#5865F2] text-white text-[10px] px-1.5 py-0">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                              {!userItem.isActive && (
                                <Badge variant="outline" className="border-red-500 text-red-400 text-[10px] px-1.5 py-0">
                                  <UserX className="w-3 h-3 mr-1" />
                                  Nonaktif
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-[#B5BAC1] text-sm truncate max-w-[180px]" title={userItem.email}>
                          {userItem.email}
                        </div>
                        {userItem.lastLoginIp && (
                          <div className="text-[#72767d] text-xs font-mono mt-1">
                            IP: {userItem.lastLoginIp}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1 text-[#B5BAC1] text-sm">
                            <Server className="w-3 h-3 text-[#5865F2]" />
                            <span>{userItem.serverCount}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[#B5BAC1] text-sm">
                            <MessageSquare className="w-3 h-3 text-[#23A559]" />
                            <span>{userItem.messageCount}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {userItem.joinedViaGroupCode === 'JEBOLTOGEL' ? (
                          <Badge 
                            className="bg-[#5865F2] text-white text-xs cursor-pointer hover:bg-[#4752C4] border-0"
                            title="User mendaftar menggunakan kode JEBOLTOGEL"
                          >
                            <Hash className="w-3 h-3 mr-1" />
                            {userItem.joinedViaGroupCode}
                          </Badge>
                        ) : userItem.joinedViaGroupCode ? (
                          <Badge 
                            variant="outline" 
                            className="border-[#72767d] text-[#B5BAC1] text-xs"
                            title="User mendaftar menggunakan kode grup ini"
                          >
                            <Hash className="w-3 h-3 mr-1" />
                            {userItem.joinedViaGroupCode}
                          </Badge>
                        ) : (
                          <span className="text-[#72767d] text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {userItem.lastLogin ? (
                          <div className="text-[#B5BAC1] text-sm">
                            <div>{formatDateTime(userItem.lastLogin)}</div>
                          </div>
                        ) : (
                          <span className="text-[#72767d] text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[#B5BAC1] text-sm">
                        {formatDate(userItem.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle Active/Disable */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${userItem.isActive ? 'text-green-500 hover:text-green-400 hover:bg-green-500/10' : 'text-red-500 hover:text-red-400 hover:bg-red-500/10'}`}
                            onClick={() => handleToggleUserActive(userItem.id, userItem.username, !userItem.isActive)}
                            disabled={userItem.id === user?.id}
                            title={userItem.isActive ? 'Nonaktifkan user' : 'Aktifkan user'}
                          >
                            {userItem.isActive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${userItem.isMasterAdmin ? 'text-[#5865F2] hover:text-[#5865F2] hover:bg-[#5865F2]/10' : 'text-[#B5BAC1] hover:text-white hover:bg-white/10'}`}
                            onClick={() => handleSetMasterAdmin(userItem.id, !userItem.isMasterAdmin)}
                            disabled={userItem.id === user?.id}
                            title={userItem.isMasterAdmin ? 'Hapus Master Admin' : 'Jadikan Master Admin'}
                          >
                            <Crown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                            onClick={() => openResetPasswordDialog(userItem.id, userItem.username)}
                            disabled={userItem.id === user?.id}
                            title="Reset Password"
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => openDeleteDialog('user', userItem.id, userItem.username)}
                            disabled={userItem.id === user?.id}
                            title="Hapus User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Servers Tab */}
          <TabsContent value="servers" className="flex-1 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B5BAC1]" />
                <Input
                  placeholder="Cari server..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#1E1F22] border-[#2B2D31] text-white"
                />
              </div>
              <Button onClick={fetchServers} variant="outline">
                Refresh
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2B2D31] hover:bg-transparent">
                    <TableHead className="text-[#B5BAC1]">Server</TableHead>
                    <TableHead className="text-[#B5BAC1]">Pemilik</TableHead>
                    <TableHead className="text-[#B5BAC1]">Anggota</TableHead>
                    <TableHead className="text-[#B5BAC1]">Channel</TableHead>
                    <TableHead className="text-[#B5BAC1]">Pesan</TableHead>
                    <TableHead className="text-[#B5BAC1]">Dibuat</TableHead>
                    <TableHead className="text-[#B5BAC1]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServers.map((server) => (
                    <TableRow key={server.id} className="border-[#2B2D31]">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {server.icon ? (
                            <img src={getAvatar(server.icon, server.name)} alt={server.name} className="w-8 h-8 rounded-lg" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#5865F2] flex items-center justify-center">
                              <Server className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <span className="text-white font-medium">{server.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#B5BAC1]">{server.ownerUsername}</TableCell>
                      <TableCell className="text-[#B5BAC1]">{server.memberCount}</TableCell>
                      <TableCell className="text-[#B5BAC1]">{server.channelCount}</TableCell>
                      <TableCell className="text-[#B5BAC1]">{server.messageCount}</TableCell>
                      <TableCell className="text-[#B5BAC1]">{formatDate(server.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog('server', server.id, server.name)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* DM Messages Tab - Chat Style */}
          <TabsContent value="messages" className="flex-1 mt-0 overflow-hidden data-[state=inactive]:hidden">
            <div className="h-full flex rounded-lg border border-[#1E1F22] bg-[#313338] overflow-hidden">
              {/* Left Sidebar - Conversation List */}
              <div className="w-80 bg-[#2B2D31] border-r border-[#1E1F22] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-[#1E1F22]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[#B5BAC1] text-xs font-semibold uppercase tracking-wider">
                      Pesan Langsung
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={fetchDMMessages}
                      className="h-6 w-6 p-0 text-[#B5BAC1] hover:text-white"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Cari percakapan..."
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    className="bg-[#1E1F22] border-[#1E1F22] text-white text-sm h-8"
                  />
                </div>
                
                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto">
                  {conversations
                    .filter(conv => {
                      if (!messageSearchQuery) return true;
                      const search = messageSearchQuery.toLowerCase();
                      return (
                        conv.participant1.displayName.toLowerCase().includes(search) ||
                        conv.participant1.username.toLowerCase().includes(search) ||
                        conv.participant2.displayName.toLowerCase().includes(search) ||
                        conv.participant2.username.toLowerCase().includes(search)
                      );
                    })
                    .map((conv) => {
                      const p1 = conv.participant1;
                      const p2 = conv.participant2;
                      return (
                        <div
                          key={conv.id}
                          onClick={() => setSelectedConversation(conv)}
                          className={`p-3 flex items-center gap-3 cursor-pointer transition-colors hover:bg-[#35373C] ${
                            selectedConversation?.id === conv.id ? 'bg-[#35373C]' : ''
                          }`}
                        >
                          {/* Double Avatar */}
                          <div className="relative flex-shrink-0">
                            <img
                              src={getAvatar(p1.avatar, p1.username)}
                              alt={p1.displayName}
                              className="w-8 h-8 rounded-full border-2 border-[#2B2D31]"
                            />
                            <img
                              src={getAvatar(p2.avatar, p2.username)}
                              alt={p2.displayName}
                              className="w-8 h-8 rounded-full border-2 border-[#2B2D31] absolute -bottom-1 -right-1"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-white font-medium text-sm truncate">
                                {p1.displayName || p1.username} ↔ {p2.displayName || p2.username}
                              </span>
                              {conv.lastMessage && (
                                <span className="text-[#B5BAC1] text-xs flex-shrink-0 ml-2">
                                  {formatChatTime(conv.lastMessage.createdAt)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-[#B5BAC1] text-sm truncate">
                                {conv.lastMessage ? (
                                  <>
                                    <span className="text-[#B5BAC1]">
                                      {conv.lastMessage.senderId === p1.id ? (p1.displayName || p1.username) : (p2.displayName || p2.username)}:
                                    </span>{' '}
                                    {conv.lastMessage.content.substring(0, 30)}
                                    {conv.lastMessage.content.length > 30 ? '...' : ''}
                                  </>
                                ) : (
                                  <span className="text-[#72767d]">-</span>
                                )}
                              </p>
                              {conv.unreadCount > 0 && (
                                <Badge className="bg-[#5865F2] text-white text-xs px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center flex-shrink-0 ml-2">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  
                  {conversations.length === 0 && (
                    <div className="text-center text-[#B5BAC1] py-8 px-4">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Belum ada percakapan</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Chat Area */}
              <div className="flex-1 flex flex-col bg-[#313338]">
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="h-14 px-4 border-b border-[#1E1F22] flex items-center gap-3 bg-[#313338]">
                      <div className="relative">
                        <img
                          src={getAvatar(selectedConversation.participant1.avatar, selectedConversation.participant1.username)}
                          alt={selectedConversation.participant1.displayName}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#313338] bg-gray-500" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-sm">
                          {selectedConversation.participant1.displayName || selectedConversation.participant1.username}
                        </h3>
                        <p className="text-[#B5BAC1] text-xs">Offline</p>
                      </div>
                      <div className="ml-4 text-[#B5BAC1]">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <div className="relative">
                        <img
                          src={getAvatar(selectedConversation.participant2.avatar, selectedConversation.participant2.username)}
                          alt={selectedConversation.participant2.displayName}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#313338] bg-gray-500" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-sm">
                          {selectedConversation.participant2.displayName || selectedConversation.participant2.username}
                        </h3>
                        <p className="text-[#B5BAC1] text-xs">Offline</p>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1">
                      {(() => {
                        let lastDate = '';
                        return selectedConversation.messages.map((msg) => {
                          const msgDate = formatChatDate(msg.createdAt);
                          const showDate = msgDate !== lastDate;
                          lastDate = msgDate;
                          const isParticipant1 = msg.senderId === selectedConversation.participant1.id;
                          
                          return (
                            <div key={msg.id}>
                              {showDate && (
                                <div className="flex justify-center my-4">
                                  <span className="bg-[#2B2D31] text-[#B5BAC1] text-xs px-3 py-1 rounded-full">
                                    {msgDate}
                                  </span>
                                </div>
                              )}
                              <div className={`flex gap-3 mb-4 ${isParticipant1 ? '' : 'flex-row-reverse'}`}>
                                <img
                                  src={isParticipant1 ? getAvatar(selectedConversation.participant1.avatar, selectedConversation.participant1.username) : getAvatar(selectedConversation.participant2.avatar, selectedConversation.participant2.username)}
                                  alt={isParticipant1 ? selectedConversation.participant1.username : selectedConversation.participant2.username}
                                  className="w-10 h-10 rounded-full flex-shrink-0"
                                />
                                <div className={`max-w-[70%] ${isParticipant1 ? '' : 'text-right'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-semibold text-sm">
                                      {isParticipant1 
                                        ? (selectedConversation.participant1.displayName || selectedConversation.participant1.username)
                                        : (selectedConversation.participant2.displayName || selectedConversation.participant2.username)
                                      }
                                    </span>
                                    <span className="text-[#B5BAC1] text-xs">
                                      {formatChatTime(msg.createdAt)}
                                    </span>
                                  </div>
                                  <div className={`inline-block px-4 py-2 rounded-2xl text-[#DBDEE1] text-sm ${
                                    isParticipant1 
                                      ? 'bg-[#383A40] rounded-tl-none' 
                                      : 'bg-[#5865F2] rounded-tr-none'
                                  }`}>
                                    {msg.content}
                                  </div>
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className={`mt-2 space-y-1 ${isParticipant1 ? '' : 'text-right'}`}>
                                      {msg.attachments.map((att, attIdx) => (
                                        <a
                                          key={attIdx}
                                          href={att.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-block text-sm text-[#5865F2] hover:underline bg-[#2B2D31] px-3 py-1.5 rounded-lg"
                                        >
                                          📎 {att.originalName}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-[#B5BAC1]">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg">Pilih percakapan untuk melihat pesan</p>
                      <p className="text-sm mt-1">Klik salah satu percakapan di sidebar kiri</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="groupcodes" className="flex-1 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-white font-semibold text-lg">Kode Grup</h3>
                <p className="text-[#B5BAC1] text-sm">Kelola kode grup untuk registrasi user</p>
              </div>
              <Button onClick={() => setCreateGroupCodeDialogOpen(true)} className="bg-[#5865F2] hover:bg-[#4752C4]">
                <Plus className="w-4 h-4 mr-2" />
                Buat Kode Grup
              </Button>
            </div>
            
            <Card className="bg-[#2B2D31] border-[#1E1F22] flex-1 flex flex-col">
              <ScrollArea className="flex-1">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#2B2D31]">
                    <tr className="border-b border-[#1E1F22]">
                      <th className="text-left p-3 text-[#B5BAC1] text-xs font-semibold uppercase">Kode</th>
                      <th className="text-left p-3 text-[#B5BAC1] text-xs font-semibold uppercase">Server</th>
                      <th className="text-left p-3 text-[#B5BAC1] text-xs font-semibold uppercase">Channel Default</th>
                      <th className="text-left p-3 text-[#B5BAC1] text-xs font-semibold uppercase">Dibuat Oleh</th>
                      <th className="text-left p-3 text-[#B5BAC1] text-xs font-semibold uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupCodes.map((group) => (
                      <tr key={group.id} className="border-b border-[#1E1F22] hover:bg-[#383A40]">
                        <td className="p-3">
                          <code className="bg-[#1E1F22] text-[#00A8FC] px-2 py-1 rounded text-sm font-mono">
                            {group.code}
                          </code>
                        </td>
                        <td className="p-3 text-white">{group.server_name || '-'}</td>
                        <td className="p-3">
                          {group.auto_join_channels ? (
                            <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                              <Hash className="w-3 h-3 mr-1" />
                              Sudah diatur
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-[#72767d] text-[#B5BAC1] text-xs">
                              Belum diatur
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-[#B5BAC1]">{group.creator_username || 'Unknown'}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDefaultChannelDialog(group)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              title="Atur Channel Default"
                            >
                              <Hash className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGroupCode(group.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              title="Hapus Kode Grup"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {groupCodes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#B5BAC1]">
                          Belum ada kode grup. Buat kode grup baru untuk memulai.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Server Access Tab */}
          <TabsContent value="channelaccess" className="flex-1 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
            {!selectedAccessServer ? (
              // List Server View
              <>
                <div className="mb-4">
                  <h3 className="text-white font-semibold text-lg">Pilih Server</h3>
                  <p className="text-[#B5BAC1] text-sm">Klik server untuk mengatur akses member</p>
                </div>
                
                {isLoadingAccess ? (
                  <div className="flex-1 flex items-center justify-center text-[#B5BAC1]">
                    Memuat data server...
                  </div>
                ) : serverAccessServers.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[#B5BAC1]">
                    Tidak ada server
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {serverAccessServers.map((srv: any) => (
                      <Card 
                        key={srv.id} 
                        className="bg-[#2B2D31] border-[#1E1F22] cursor-pointer hover:bg-[#35373C] transition-colors"
                        onClick={() => fetchServerMembersAccess(srv.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            {srv.icon ? (
                              <img src={getAvatar(srv.icon, srv.name)} alt={srv.name} className="w-12 h-12 rounded-lg object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-[#5865F2] flex items-center justify-center">
                                <Server className="w-6 h-6 text-white" />
                              </div>
                            )}
                            <div>
                              <h4 className="text-white font-medium">{srv.name}</h4>
                              <p className="text-[#B5BAC1] text-sm">
                                {srv.member_count || 0} member 
                                <span className="text-green-400">({srv.active_count || 0} aktif</span>, 
                                <span className="text-red-400">{srv.inactive_count || 0} nonaktif)</span>
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // Server Detail View with Members
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedAccessServer(null)}
                        className="text-[#B5BAC1] hover:text-white"
                      >
                        ← Kembali
                      </Button>
                      <h3 className="text-white font-semibold text-lg">{selectedAccessServer.name}</h3>
                    </div>
                    <p className="text-[#B5BAC1] text-sm ml-10">Atur akses member ke server ini</p>
                  </div>
                  <Button onClick={() => fetchServerMembersAccess(selectedAccessServer.id)} variant="outline" size="sm">
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingAccess ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {isLoadingAccess ? (
                  <div className="flex-1 flex items-center justify-center text-[#B5BAC1]">
                    Memuat data member...
                  </div>
                ) : serverMembersAccess.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[#B5BAC1]">
                    Tidak ada member di server ini
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-[#2B2D31]">
                        <tr className="border-b border-[#1E1F22]">
                          <th className="text-left p-3 text-[#B5BAC1] text-xs font-semibold uppercase">Member</th>
                          <th className="text-left p-3 text-[#B5BAC1] text-xs font-semibold uppercase w-[150px]">Status Akses</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serverMembersAccess.map((member: any) => (
                          <tr key={member.id} className="border-b border-[#1E1F22] hover:bg-[#383A40]">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={getAvatar(member.avatar, member.username)} 
                                  alt={member.username}
                                  className="w-10 h-10 rounded-full"
                                />
                                <div>
                                  <p className="text-white font-medium">{member.display_name || member.username}</p>
                                  <p className="text-[#B5BAC1] text-xs">@{member.username}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => toggleServerAccess(member.id, selectedAccessServer.id, !member.is_allowed)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  member.is_allowed 
                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30' 
                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                                }`}
                              >
                                {member.is_allowed ? 'Aktif' : 'Nonaktif'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#2B2D31] border-[#1E1F22]">
          <DialogHeader>
            <DialogTitle className="text-white">Konfirmasi Hapus</DialogTitle>
            <DialogDescription className="text-[#B5BAC1]">
              Apakah Anda yakin ingin menghapus {deleteTarget?.type === 'user' ? 'pengguna' : 'server'} 
              <strong className="text-white"> {deleteTarget?.name}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="bg-[#2B2D31] border-[#1E1F22] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Reset Password</DialogTitle>
            <DialogDescription className="text-[#B5BAC1]">
              {!showResetResult ? (
                <>
                  Reset password untuk user <strong className="text-white">{resetPasswordTarget?.name}</strong>.
                  <br /><br />
                  Password random telah digenerate. Copy dan berikan kepada user.
                  User wajib mengganti password saat login berikutnya.
                </>
              ) : (
                <>
                  ✅ Password berhasil direset!
                  <br /><br />
                  <span className="text-yellow-400">Berikan password ini kepada user:</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {!showResetResult ? (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-[#B5BAC1] mb-2 block">Password Sementara (Auto-Generated)</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={tempPassword}
                    readOnly
                    className="bg-[#1E1F22] border-[#2B2D31] text-white font-mono text-lg"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTempPassword(generateRandomPassword())}
                    title="Generate ulang"
                    className="flex-shrink-0"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(tempPassword);
                      toast.success('Password disalin ke clipboard');
                    }}
                    title="Copy password"
                    className="flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-[#B5BAC1] mt-2">
                  Klik 🔄 untuk generate ulang atau 📋 untuk copy
                </p>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-3">
              <div className="bg-[#1E1F22] border border-[#5865F2] rounded-lg p-4 text-center">
                <p className="text-2xl font-mono text-white tracking-wider">{tempPassword}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  toast.success('Password disalin ke clipboard');
                }}
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Password
              </Button>
              <p className="text-xs text-[#B5BAC1] text-center">
                Password ini hanya ditampilkan sekali. Pastikan user mencatatnya.
              </p>
            </div>
          )}

          <DialogFooter>
            {!showResetResult ? (
              <>
                <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                  Batal
                </Button>
                <Button 
                  variant="default" 
                  onClick={handleResetPassword}
                  className="bg-[#5865F2] hover:bg-[#4752C4]"
                >
                  Reset Password
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => setResetPasswordDialogOpen(false)}
                className="w-full"
              >
                Tutup
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Group Code Dialog */}
      <Dialog open={createGroupCodeDialogOpen} onOpenChange={setCreateGroupCodeDialogOpen}>
        <DialogContent className="bg-[#2B2D31] border-[#1E1F22] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Buat Kode Grup</DialogTitle>
            <DialogDescription className="text-[#B5BAC1]">
              Buat kode grup yang dapat digunakan user saat registrasi untuk otomatis bergabung ke server.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-[#B5BAC1] mb-2 block">Kode Grup</label>
              <Input
                type="text"
                value={newGroupCode.code}
                onChange={(e) => setNewGroupCode({ ...newGroupCode, code: e.target.value.toUpperCase() })}
                placeholder="Contoh: JEBOLTOGEL"
                className="bg-[#1E1F22] border-[#2B2D31] text-white uppercase"
              />
              <p className="text-xs text-[#B5BAC1] mt-1">User akan memasukkan kode ini saat registrasi</p>
            </div>
            <div>
              <label className="text-sm text-[#B5BAC1] mb-2 block">Server Tujuan</label>
              <Select 
                value={newGroupCode.serverId} 
                onValueChange={(value) => setNewGroupCode({ ...newGroupCode, serverId: value })}
              >
                <SelectTrigger className="bg-[#1E1F22] border-[#2B2D31] text-white">
                  <SelectValue placeholder="Pilih server" />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F22] border-[#2B2D31]">
                  {servers.map((server) => (
                    <SelectItem key={server.id} value={server.id} className="text-white">
                      {server.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#B5BAC1] mt-1">User akan otomatis bergabung ke server ini</p>
            </div>
            <div>
              <label className="text-sm text-[#B5BAC1] mb-2 block">Max Penggunaan (opsional)</label>
              <Input
                type="number"
                value={newGroupCode.maxUses}
                onChange={(e) => setNewGroupCode({ ...newGroupCode, maxUses: e.target.value })}
                placeholder="Kosongkan untuk unlimited"
                className="bg-[#1E1F22] border-[#2B2D31] text-white"
              />
              <p className="text-xs text-[#B5BAC1] mt-1">Batasi berapa kali kode ini bisa digunakan</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateGroupCodeDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleCreateGroupCode}
              disabled={!newGroupCode.code || !newGroupCode.serverId}
              className="bg-[#5865F2] hover:bg-[#4752C4]"
            >
              Buat Kode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Default Channel Dialog */}
      <Dialog open={defaultChannelDialogOpen} onOpenChange={setDefaultChannelDialogOpen}>
        <DialogContent className="bg-[#2B2D31] border-[#1E1F22] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Atur Channel Default</DialogTitle>
            <DialogDescription className="text-[#B5BAC1]">
              Pilih channel yang akan ditampilkan pertama kali saat user bergabung menggunakan kode grup{' '}
              <strong className="text-white">{selectedGroupCode?.code}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isLoadingChannels ? (
              <div className="text-center text-[#B5BAC1] py-4">
                Memuat daftar channel...
              </div>
            ) : groupCodeChannels.length === 0 ? (
              <div className="text-center text-[#B5BAC1] py-4">
                Tidak ada channel di server ini.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                <div 
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedDefaultChannel === '' 
                      ? 'bg-[#5865F2] text-white' 
                      : 'bg-[#1E1F22] text-[#B5BAC1] hover:bg-[#35373C]'
                  }`}
                  onClick={() => setSelectedDefaultChannel('')}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    <span>Tidak ada (user memilih sendiri)</span>
                  </div>
                </div>
                
                {groupCodeChannels
                  .filter((ch: any) => ch.type === 'text')
                  .map((channel: any) => (
                    <div 
                      key={channel.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedDefaultChannel === channel.id 
                          ? 'bg-[#5865F2] text-white' 
                          : 'bg-[#1E1F22] text-[#B5BAC1] hover:bg-[#35373C]'
                      }`}
                      onClick={() => setSelectedDefaultChannel(channel.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        <span>{channel.name}</span>
                      </div>
                      {channel.category_name && (
                        <div className={`text-xs mt-1 ${
                          selectedDefaultChannel === channel.id ? 'text-white/70' : 'text-[#72767d]'
                        }`}>
                          Kategori: {channel.category_name}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDefaultChannelDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleUpdateDefaultChannel}
              disabled={isLoadingChannels}
              className="bg-[#5865F2] hover:bg-[#4752C4]"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

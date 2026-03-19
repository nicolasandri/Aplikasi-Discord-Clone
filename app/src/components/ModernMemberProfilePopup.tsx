import { useState, useEffect } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ServerMember } from '@/types';

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = import.meta.env.VITE_API_URL;
const BASE_URL = import.meta.env.VITE_SOCKET_URL;

interface ModernMemberProfilePopupProps {
  member: ServerMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: () => void;
  serverId?: string | null;
  isMobile?: boolean;
}

const statusColors = {
  online: 'bg-[#3ba55d]',
  idle: 'bg-[#faa61a]',
  dnd: 'bg-[#ed4245]',
  offline: 'bg-[#747f8d]',
};

const statusText = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};

export function ModernMemberProfilePopup({
  member,
  isOpen,
  onClose,
  onSendMessage,
  serverId,
  isMobile = false
}: ModernMemberProfilePopupProps) {
  const [mounted, setMounted] = useState(false);
  const [customRoles, setCustomRoles] = useState<Array<{ id: string; name: string; color: string; position: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      if (serverId) {
        fetchCustomRoles(serverId);
      }
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, member, serverId]);

  const fetchCustomRoles = async (sid: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/servers/${sid}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomRoles(data.filter((r: any) => !r.is_default));
      }
    } catch (e) {
      console.error('Failed to fetch custom roles:', e);
    }
  };

  if (!mounted || !member) return null;

  const displayName = member.displayName || member.username;
  const username = member.username;

  const getAvatarUrl = () => {
    if (!member.avatar) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'user'}`;
    }
    if (member.avatar?.startsWith('http')) {
      return member.avatar;
    }
    return `${BASE_URL}${member.avatar}`;
  };

  const getBannerColor = () => {
    if (member.roles && member.roles.length > 0 && customRoles.length > 0) {
      const sortedRoles = [...member.roles].sort((a, b) => {
        const roleA = customRoles.find(cr => cr.id === a.id);
        const roleB = customRoles.find(cr => cr.id === b.id);
        return (roleB?.position || 0) - (roleA?.position || 0);
      });
      return sortedRoles[0]?.color || member.role_color || '#00d4ff';
    }
    if (member.role_color) return member.role_color;
    if (member.role === 'owner') return '#ffd700';
    if (member.role === 'admin') return '#ed4245';
    if (member.role === 'moderator') return '#43b581';
    return '#00d4ff';
  };

  // Mobile: full screen modal, Desktop: positioned card
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Full Screen Modal */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#1e1f22] to-[#15172d] rounded-t-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="sticky top-4 right-4 z-10 p-2 ml-auto block text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="px-4 pb-6 pt-2">
                {/* Avatar */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex justify-center mb-4"
                >
                  <div className="relative">
                    <img
                      src={getAvatarUrl()}
                      alt={displayName}
                      className="w-20 h-20 rounded-full border-4 border-[#1e1f22] ring-2 ring-white/10"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'user'}`;
                      }}
                    />
                    <div
                      className={`absolute bottom-0 right-0 w-5 h-5 ${statusColors[member.status || 'offline']} rounded-full border-2 border-[#1e1f22]`}
                    />
                  </div>
                </motion.div>

                {/* Profile Info */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-center mb-6"
                >
                  <h2
                    className="text-2xl font-bold tracking-tight"
                    style={{ color: getBannerColor() }}
                  >
                    {displayName}
                  </h2>
                  <p className="text-white/60 text-sm">@{username}</p>

                  {/* Badges */}
                  {member.badges && member.badges.length > 0 && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {member.badges.includes('vip') && (
                        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded font-semibold border border-cyan-500/30">
                          VIP
                        </span>
                      )}
                      {member.badges.includes('crown') && <span className="text-lg">👑</span>}
                      {member.badges.includes('verified') && <span className="text-lg">✓</span>}
                    </div>
                  )}
                </motion.div>

                {/* Status */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-center gap-2 mb-6"
                >
                  <div className={`w-2 h-2 ${statusColors[member.status || 'offline']} rounded-full`} />
                  <span className="text-white/60 text-sm">
                    {statusText[member.status || 'offline']}
                  </span>
                </motion.div>

                {/* Divider */}
                <div className="h-px bg-white/10 mb-6" />

                {/* Member Since */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="mb-6"
                >
                  <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
                    Member Since
                  </h3>
                  <p className="text-white/50 text-sm">
                    {member.joinedAt || (member as any).joined_at
                      ? new Date(member.joinedAt || (member as any).joined_at).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Unknown'}
                  </p>
                </motion.div>

                {/* Roles/Jobdesk */}
                {(member.roles?.length || member.role) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6"
                  >
                    <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-3">
                      Roles
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {member.roles && member.roles.length > 0
                        ? [...member.roles]
                            .sort((a, b) => {
                              const roleA = customRoles.find(cr => cr.id === a.id);
                              const roleB = customRoles.find(cr => cr.id === b.id);
                              return (roleB?.position || 0) - (roleA?.position || 0);
                            })
                            .map((role: any) => (
                              <div
                                key={role.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: `${role.color || '#99aab5'}20`,
                                  color: role.color || '#99aab5',
                                  border: `1px solid ${role.color || '#99aab5'}40`
                                }}
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: role.color || '#99aab5' }}
                                />
                                {role.name}
                              </div>
                            ))
                        : (
                            <div
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${member.role_color || '#99aab5'}20`,
                                color: member.role_color || '#99aab5',
                                border: `1px solid ${member.role_color || '#99aab5'}40`
                              }}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: member.role_color || '#99aab5' }}
                              />
                              {member.role_name || member.role || 'Member'}
                            </div>
                          )}
                    </div>
                  </motion.div>
                )}

                {/* Send Message Button */}
                {onSendMessage && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onSendMessage}
                    className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500/80 to-blue-500/80 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Kirim Pesan
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Desktop version
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            onClick={onClose}
          />

          {/* Desktop Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            className="absolute right-[260px] top-[80px] w-[340px] bg-gradient-to-b from-[#1e1f22] to-[#15172d] rounded-xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Banner */}
            <div
              className="h-24 w-full"
              style={{
                background: `linear-gradient(135deg, ${getBannerColor()} 0%, #1e1f22 100%)`
              }}
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Avatar */}
            <div className="px-4 -mt-12 relative mb-4">
              <div className="relative inline-block">
                <img
                  src={getAvatarUrl()}
                  alt={displayName}
                  className="w-20 h-20 rounded-full border-4 border-[#1e1f22] ring-2 ring-white/10"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'user'}`;
                  }}
                />
                <div
                  className={`absolute bottom-0 right-0 w-4 h-4 ${statusColors[member.status || 'offline']} rounded-full border-[3px] border-[#1e1f22]`}
                />
              </div>
            </div>

            {/* Profile Info */}
            <div className="px-4 pb-4">
              <div className="mb-3">
                <h2
                  className="text-lg font-bold tracking-tight"
                  style={{ color: getBannerColor() }}
                >
                  {displayName}
                </h2>
                <p className="text-white/60 text-xs">@{username}</p>
                {member.badges && member.badges.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    {member.badges.includes('vip') && (
                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] rounded font-semibold border border-cyan-500/30">
                        VIP
                      </span>
                    )}
                    {member.badges.includes('crown') && <span>👑</span>}
                    {member.badges.includes('verified') && <span className="text-cyan-500">✓</span>}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 mt-2 mb-3">
                <div className={`w-2 h-2 ${statusColors[member.status || 'offline']} rounded-full`} />
                <span className="text-white/60 text-xs">
                  {statusText[member.status || 'offline']}
                </span>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/10 my-3" />

              {/* Member Since */}
              <div className="mb-3">
                <h3 className="text-[10px] font-semibold text-white/70 uppercase tracking-wide mb-1">
                  Member Since
                </h3>
                <div className="text-white/50 text-xs">
                  {member.joinedAt || (member as any).joined_at
                    ? new Date(member.joinedAt || (member as any).joined_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'Unknown'}
                </div>
              </div>

              {/* Roles */}
              {(member.roles?.length || member.role) && (
                <div className="mb-3">
                  <h3 className="text-[10px] font-semibold text-white/70 uppercase tracking-wide mb-2">
                    Roles
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {member.roles && member.roles.length > 0
                      ? [...member.roles]
                          .sort((a, b) => {
                            const roleA = customRoles.find(cr => cr.id === a.id);
                            const roleB = customRoles.find(cr => cr.id === b.id);
                            return (roleB?.position || 0) - (roleA?.position || 0);
                          })
                          .map((role: any) => (
                            <div
                              key={role.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium"
                              style={{
                                backgroundColor: `${role.color || '#99aab5'}15`,
                                color: role.color || '#99aab5',
                                border: `0.5px solid ${role.color || '#99aab5'}40`
                              }}
                            >
                              <div
                                className="w-1 h-1 rounded-full"
                                style={{ backgroundColor: role.color || '#99aab5' }}
                              />
                              {role.name}
                            </div>
                          ))
                      : (
                            <div
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium"
                              style={{
                                backgroundColor: `${member.role_color || '#99aab5'}15`,
                                color: member.role_color || '#99aab5',
                                border: `0.5px solid ${member.role_color || '#99aab5'}40`
                              }}
                            >
                              <div
                                className="w-1 h-1 rounded-full"
                                style={{ backgroundColor: member.role_color || '#99aab5' }}
                              />
                              {member.role_name || member.role || 'Member'}
                            </div>
                          )}
                  </div>
                </div>
              )}

              {/* Send Message Button */}
              {onSendMessage && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onSendMessage}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500/70 to-blue-500/70 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold rounded-lg transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Pesan
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

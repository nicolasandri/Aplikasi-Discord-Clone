import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Clock, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PermissionType {
  id: string;
  server_id: string;
  name: string;
  max_duration: number;
  created_at: string;
}

interface PermissionTypesSettingsProps {
  serverId: string;
}

export function PermissionTypesSettings({ serverId }: PermissionTypesSettingsProps) {
  const [permissionTypes, setPermissionTypes] = useState<PermissionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newDuration, setNewDuration] = useState(5);
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState(5);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchPermissionTypes();
  }, [serverId]);

  const fetchPermissionTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/permission-types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPermissionTypes(data);
      } else {
        toast.error('Gagal memuat jenis izin');
      }
    } catch (error) {
      console.error('Error fetching permission types:', error);
      toast.error('Gagal memuat jenis izin');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Nama jenis izin harus diisi');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/permission-types`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newName.trim(),
          maxDuration: newDuration
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPermissionTypes([...permissionTypes, data]);
        setNewName('');
        setNewDuration(5);
        setIsCreating(false);
        toast.success('Jenis izin berhasil ditambahkan');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menambahkan jenis izin');
      }
    } catch (error) {
      console.error('Error creating permission type:', error);
      toast.error('Gagal menambahkan jenis izin');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/permission-types/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editName.trim(),
          maxDuration: editDuration
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPermissionTypes(permissionTypes.map(pt => pt.id === id ? data : pt));
        setEditingId(null);
        toast.success('Jenis izin berhasil diperbarui');
      } else {
        toast.error('Gagal memperbarui jenis izin');
      }
    } catch (error) {
      console.error('Error updating permission type:', error);
      toast.error('Gagal memperbarui jenis izin');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jenis izin ini?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/permission-types/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setPermissionTypes(permissionTypes.filter(pt => pt.id !== id));
        toast.success('Jenis izin berhasil dihapus');
      } else {
        toast.error('Gagal menghapus jenis izin');
      }
    } catch (error) {
      console.error('Error deleting permission type:', error);
      toast.error('Gagal menghapus jenis izin');
    }
  };

  const startEdit = (pt: PermissionType) => {
    setEditingId(pt.id);
    setEditName(pt.name);
    setEditDuration(pt.max_duration);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin w-6 h-6 border-2 border-[#00d4ff] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Jenis Izin</h3>
          <p className="text-sm text-[#6a6a7a]">Kelola jenis izin keluar untuk server ini</p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="bg-[#00d4ff] hover:bg-[#00d4ff]/80 text-black"
          disabled={isCreating}
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Jenis
        </Button>
      </div>

      {isCreating && (
        <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-medium text-white">Tambah Jenis Izin Baru</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#6a6a7a] mb-1 block">Nama Jenis</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: wc, makan, rokok"
                className="bg-[#0d0d14] border-[#2a2a3a] text-white"
              />
            </div>
            <div>
              <label className="text-xs text-[#6a6a7a] mb-1 block">Durasi Maksimal (menit)</label>
              <Input
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(parseInt(e.target.value) || 5)}
                min={1}
                max={60}
                className="bg-[#0d0d14] border-[#2a2a3a] text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              className="bg-[#00d4ff] hover:bg-[#00d4ff]/80 text-black"
            >
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreating(false);
                setNewName('');
                setNewDuration(5);
              }}
              className="text-[#6a6a7a] hover:text-white"
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {permissionTypes.length === 0 ? (
          <div className="text-center py-8 text-[#6a6a7a]">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Belum ada jenis izin</p>
            <p className="text-sm">Klik "Tambah Jenis" untuk membuat yang pertama</p>
          </div>
        ) : (
          permissionTypes.map((pt) => (
            <div
              key={pt.id}
              className="bg-[#1a1a24] border border-[#2a2a3a] rounded-lg p-4 flex items-center justify-between"
            >
              {editingId === pt.id ? (
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-[#0d0d14] border-[#2a2a3a] text-white"
                  />
                  <Input
                    type="number"
                    value={editDuration}
                    onChange={(e) => setEditDuration(parseInt(e.target.value) || 5)}
                    min={1}
                    max={60}
                    className="bg-[#0d0d14] border-[#2a2a3a] text-white"
                  />
                </div>
              ) : (
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium capitalize">{pt.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-[#2a2a3a] text-[#6a6a7a] rounded-full">
                      {pt.max_duration} menit
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                {editingId === pt.id ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(pt.id)}
                      className="bg-[#00d4ff] hover:bg-[#00d4ff]/80 text-black"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      className="text-[#6a6a7a] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(pt)}
                      className="text-[#6a6a7a] hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(pt.id)}
                      className="text-[#6a6a7a] hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

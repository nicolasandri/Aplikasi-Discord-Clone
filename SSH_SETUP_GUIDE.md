# SSH Key Setup Guide untuk VPS 152.42.242.180

## SSH Key Generated ✅

**Key Location:** `C:\Users\PC\.ssh\workgrid_vps`
**Key Type:** RSA 4096-bit
**Fingerprint:** `SHA256:SPJRPMkSD6+KyRzFKitqyO+ZvAaC4heiw8lcUUspBLE`

---

## Step 1: Add Public Key ke VPS

Anda perlu login ke VPS dulu menggunakan password untuk setup SSH key:

```bash
ssh root@152.42.242.180
# Password: %0|F?H@f!berhO3e
```

---

## Step 2: Create ~/.ssh Directory & authorized_keys

Setelah login ke VPS, jalankan perintah ini:

```bash
# Buat directory .ssh jika belum ada
mkdir -p ~/.ssh

# Set permissions yang benar
chmod 700 ~/.ssh

# Buat file authorized_keys jika belum ada
touch ~/.ssh/authorized_keys

# Set permissions
chmod 600 ~/.ssh/authorized_keys
```

---

## Step 3: Add Public Key ke authorized_keys

Copy public key berikut ke VPS:

```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC1m6VG1dqPZ0rKLIQ0jHjb1buRBNJCH1XRHPIPZ62PCoQiIlvzlGwUS4GIklSm9AlosHQHsh07L0JLgZWx/ISg20vyGmq3TXeMSuw+pUE/McaAoFQBeXtUHaM/mchGFFf1ApHLAjkVEFl8/4cuyHDHPbw/bd7qiu8igIKilD/nVWP1AnX4apk8qho7W25vxL37q/q0qPakDtkX5N/BG+d1/YFYHdKkQQSYY1fVtrqn2Y5cxJV9J1NDjq+TToOg/KsPYea6DXyINBpaoOhqP+lzQhYW/BkLfaM33LUtcG3RnIWF+C8WgUPjYi8I77xKvxTYI7lLZKR7Z4JkAGEL4/wgY2mmAY5Z+I18vHQR2Z5cHeK6zIVxVkuyYu5ejqUbHgNGlmxFWTjZ0xlfkLfDZX9TtbNHb1rP2HlnKDbMTss3AX2Wcz4vWP6TIjl+1fjs/AvgsKvUiIalQgXz0AUgUf+s9JnW5Z/ujudImFO8vNmbh0d3VFEpvXAb993g855yWt80+FVTjNgL5TZBUUbn/JQjI/I2qaSt92JQAVAfY2vdqYYmuwmnvoNswm7WNM5aL3/Ukbg+HHsN918P/EFSwcFwqJZg0bL/CsMxeWcCnB7KQv9ugiDLEhpereFR1fbojwFVqkFxK+/xu5BQ8kadT1vpkVcBVQoTRXpibFrkNX9RlQ== workgrid@152.42.242.180
```

Di VPS, append public key ke file:

```bash
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC1m6VG1dqPZ0rKLIQ0jHjb1buRBNJCH1XRHPIPZ62PCoQiIlvzlGwUS4GIklSm9AlosHQHsh07L0JLgZWx/ISg20vyGmq3TXeMSuw+pUE/McaAoFQBeXtUHaM/mchGFFf1ApHLAjkVEFl8/4cuyHDHPbw/bd7qiu8igIKilD/nVWP1AnX4apk8qho7W25vxL37q/q0qPakDtkX5N/BG+d1/YFYHdKkQQSYY1fVtrqn2Y5cxJV9J1NDjq+TToOg/KsPYea6DXyINBpaoOhqP+lzQhYW/BkLfaM33LUtcG3RnIWF+C8WgUPjYi8I77xKvxTYI7lLZKR7Z4JkAGEL4/wgY2mmAY5Z+I18vHQR2Z5cHeK6zIVxVkuyYu5ejqUbHgNGlmxFWTjZ0xlfkLfDZX9TtbNHb1rP2HlnKDbMTss3AX2Wcz4vWP6TIjl+1fjs/AvgsKvUiIalQgXz0AUgUf+s9JnW5Z/ujudImFO8vNmbh0d3VFEpvXAb993g855yWt80+FVTjNgL5TZBUUbn/JQjI/I2qaSt92JQAVAfY2vdqYYmuwmnvoNswm7WNM5aL3/Ukbg+HHsN918P/EFSwcFwqJZg0bL/CsMxeWcCnB7KQv9ugiDLEhpereFR1fbojwFVqkFxK+/xu5BQ8kadT1vpkVcBVQoTRXpibFrkNX9RlQ== workgrid@152.42.242.180" >> ~/.ssh/authorized_keys
```

---

## Step 4: Verify & Test Connection

Di Windows (from Claude Code), test koneksi:

```bash
ssh -i ~/.ssh/workgrid_vps root@152.42.242.180
```

Atau jika menggunakan Git Bash / PowerShell:

```bash
ssh -i C:\Users\PC\.ssh\workgrid_vps root@152.42.242.180
```

---

## Optional: Configure SSH Config untuk Kemudahan

Buat file `~/.ssh/config` (atau edit jika sudah ada):

```
Host workgrid-vps
    HostName 152.42.242.180
    User root
    IdentityFile ~/.ssh/workgrid_vps
    Port 22
```

Kemudian cukup connect dengan:

```bash
ssh workgrid-vps
```

---

## Step 5: Disable Password Authentication (Optional tapi Recommended)

Setelah SSH key setup berhasil dan sudah bisa login, disable password auth di VPS:

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Cari dan ubah menjadi:
# PasswordAuthentication no
# PubkeyAuthentication yes

# Restart SSH
sudo systemctl restart sshd
```

---

## Troubleshooting

### Error: "Permission denied (publickey,password)"
- Pastikan public key sudah di `~/.ssh/authorized_keys` di VPS
- Check file permissions: `chmod 600 ~/.ssh/authorized_keys`

### Error: "No such file or directory"
- Pastikan directory `~/.ssh` sudah dibuat: `mkdir -p ~/.ssh`
- Set permissions: `chmod 700 ~/.ssh`

### Cannot connect
- Cek apakah SSH service running: `sudo systemctl status ssh`
- Cek port 22 terbuka: `sudo ufw allow 22`
- Restart SSH: `sudo systemctl restart ssh`

---

## Next: Deploy to VPS

Setelah SSH setup berhasil, Anda bisa:

1. Deploy aplikasi WorkGrid ke VPS
2. Build Docker images
3. Setup database
4. Configure SSL/TLS
5. Deploy dengan Docker Compose

Gunakan SSH untuk upload files:

```bash
# Upload files
scp -i ~/.ssh/workgrid_vps -r ./app root@152.42.242.180:/root/workgrid/app

# Upload docker-compose
scp -i ~/.ssh/workgrid_vps docker-compose.yml root@152.42.242.180:/root/workgrid/
```

---

**Status:** SSH Key ready for use ✅
**Next Step:** Add public key ke VPS & test connection

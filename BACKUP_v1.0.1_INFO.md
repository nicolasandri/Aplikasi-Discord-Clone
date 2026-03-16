# WORKGRID BACKUP - v1.0.1

## Backup Information

| Property | Value |
|----------|-------|
| **Version** | v1.0.1 |
| **Backup Date** | 2026-03-16 |
| **Backup Time** | 04:49:45 WIB (Asia/Jakarta) |
| **Timestamp** | 20260316_044945 |
| **Backup Name** | workgrid_20260316_044945_v1.0.1 |

---

## Changes in This Version

### Bug Fixes

#### 1. FIXED: DM User Names Showing "Unknown"
**Problem:** User names showing "Unknown" in sidebar and header

**Root Cause:** 
- API returns `members` array in DM channel response
- Frontend expected `friend` object directly

**Solution:**
- Extract friend from `members` array where user ID != current user ID
- Normalize `displayName` from `display_name` or `username`

**Files Modified:**
- `app/src/components/DMList.tsx`
- `app/src/components/ChatLayout.tsx`

---

#### 2. FIXED: Timestamps Showing UTC Instead of WIB
**Problem:** DM message timestamps showing UTC time instead of WIB (Asia/Jakarta)

**Root Cause:**
- Database storing timestamps in UTC
- Backend using UTC timezone
- Frontend displaying raw timestamps

**Solution:**
1. **VPS Configuration:**
   - Set VPS timezone to `Asia/Jakarta`
   - Install `openntpd` with Indonesian NTP servers

2. **Docker Configuration:**
   - PostgreSQL container: `TZ=Asia/Jakarta`, `PGTZ=Asia/Jakarta`
   - Backend container: `TZ=Asia/Jakarta` with `tzdata` package
   - Mount `/etc/localtime` for time sync

3. **Backend Configuration:**
   - Update `server/config/database.js` with timezone settings:
     ```javascript
     options: '-c timezone=Asia/Jakarta',
     pool.on('connect', (client) => {
       client.query("SET timezone = 'Asia/Jakarta'");
     });
     ```

4. **Frontend Configuration:**
   - Update `formatTime()` in `DMChatArea.tsx`:
     ```typescript
     return date.toLocaleTimeString('id-ID', {
       hour: '2-digit',
       minute: '2-digit',
       second: '2-digit',
       hour12: false,  // 24-hour format
       timeZone: 'Asia/Jakarta'
     });
     ```

**Files Modified:**
- `docker-compose.vps.yml`
- `server/config/database.js`
- `server/Dockerfile`
- `app/src/components/DMChatArea.tsx`

---

## Files Modified

### Config Files
| File | Description |
|------|-------------|
| `docker-compose.vps.yml` | Docker compose configuration with TZ settings |
| `database.js` | Backend database config with timezone support |

### Frontend Components
| File | Description |
|------|-------------|
| `DMChatArea.tsx` | DM chat with WIB timezone formatting |
| `DMList.tsx` | DM list with friend extraction fix |
| `ChatLayout.tsx` | Layout with DM channel mapping fix |

---

## Local Backup Location
- **VPS**: `/opt/workgrid/backups/versions/workgrid_20260316_044945_v1.0.1/`
- **Archive**: `/opt/workgrid/backups/versions/workgrid_20260316_044945_v1.0.1.tar.gz`
- **Local**: File-file sudah diupdate di folder project Anda

---

## Git Status
Commit dibuat di VPS dengan hash: `ef8bc49`
Message: `Backup v1.0.1 - DM timezone fix WIB`

Untuk push ke GitHub:
```bash
cd /opt/workgrid
git push origin main
```
*(Note: Push memerlukan autentikasi GitHub)*

---

*Backup created: 2026-03-16 04:49:45 WIB*

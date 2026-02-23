# PostgreSQL Migration Guide

Guide ini menjelaskan cara migrasi database dari SQLite ke PostgreSQL untuk Discord Clone project agar dapat handle **110 concurrent users**.

## 📋 Prerequisites

1. **PostgreSQL Server** terinstall (versi 12 atau lebih baru)
2. **Node.js** dan npm terinstall
3. **Git** untuk backup

## 🚀 Quick Start (Windows PowerShell)

### Step 1: Backup Database SQLite (Opsional tapi Direkomendasikan)

```powershell
cd server/scripts
.\backup-sqlite.ps1
```

### Step 2: Install PostgreSQL

Download dan install PostgreSQL dari [postgresql.org](https://www.postgresql.org/download/)

Atau gunakan Docker:
```bash
docker run --name postgres-discord \
  -e POSTGRES_USER=discord_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=discord_clone \
  -p 5432:5432 \
  -d postgres:15
```

### Step 3: Install Dependencies

```bash
cd server
npm install
```

### Step 4: Setup Environment Variables

Buat atau update file `.env` di folder `server/`:

```env
# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_clone
DB_USER=discord_user
DB_PASSWORD=your_secure_password
DB_SSL=false

# Application Configuration
JWT_SECRET=your-jwt-secret-key
PORT=3001
NODE_ENV=production

# Database Selection
USE_POSTGRES=true
```

### Step 5: Run Migration

```powershell
# PowerShell
cd server/scripts
.\switch-to-postgres.ps1

# Atau manual:
cd server
node migrations/setup-postgres.js
node migrations/002_migrate_sqlite_to_postgres.js
```

### Step 6: Start Server

```bash
cd server
npm start
```

## 📁 File Structure

```
server/
├── config/
│   └── database.js           # PostgreSQL connection config
├── migrations/
│   ├── 001_initial_schema.sql    # PostgreSQL schema
│   ├── 002_migrate_sqlite_to_postgres.js  # Data migration
│   └── setup-postgres.js     # Setup script
├── scripts/
│   ├── backup-sqlite.ps1     # Backup script
│   ├── switch-to-postgres.ps1   # Migration script
│   └── rollback-to-sqlite.ps1   # Rollback script
├── database.js               # SQLite module (original)
├── database-postgres.js      # PostgreSQL module
├── database-sqlite-backup.js # Backup of original
└── MIGRATION_GUIDE.md        # This file
```

## 🔧 Manual Migration Steps

### 1. Create PostgreSQL Database

```sql
-- Connect as postgres user
psql -U postgres

-- Create database
CREATE DATABASE discord_clone;

-- Create user (opsional)
CREATE USER discord_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE discord_clone TO discord_user;
```

### 2. Create Schema

```bash
cd server
psql -U discord_user -d discord_clone -f migrations/001_initial_schema.sql
```

### 3. Migrate Data

```bash
node migrations/002_migrate_sqlite_to_postgres.js
```

## 🔄 Rollback ke SQLite

Jika terjadi masalah, rollback ke SQLite:

```powershell
cd server/scripts
.\rollback-to-sqlite.ps1
```

Lalu update `.env`:
```env
USE_POSTGRES=false
```

## 📊 Performance Comparison

| Metric | SQLite | PostgreSQL |
|--------|--------|------------|
| Max Concurrent Users | ~10-20 | 100+ |
| Connection Pool | None | 25 connections |
| Read Performance | Good | Excellent |
| Write Performance | Good (single user) | Excellent (concurrent) |
| Transactions | Limited | Full ACID |
| Scalability | Single file | Horizontal possible |

## ⚙️ Configuration untuk 110 Concurrent Users

### PostgreSQL Connection Pool (sudah dikonfigurasi)

```javascript
// server/config/database.js
const pool = new Pool({
  max: 25,                    // 25 connections
  idleTimeoutMillis: 30000,   // 30s timeout
  connectionTimeoutMillis: 2000, // 2s connection timeout
});
```

### PostgreSQL Server Tuning

Edit `postgresql.conf`:

```ini
# Connection Settings
max_connections = 200

# Memory Settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 256MB

# Checkpoint Settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200
```

## 🧪 Testing Concurrent Users

Install Artillery untuk load testing:

```bash
npm install -g artillery
```

Buat test script `load-test.yml`:

```yaml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 2
      name: "Warm up"
    - duration: 120
      arrivalRate: 5
      rampTo: 50
      name: "Ramp up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
  defaults:
    headers:
      Authorization: 'Bearer YOUR_JWT_TOKEN'

scenarios:
  - name: "Get servers"
    weight: 40
    requests:
      - get:
          url: "/api/servers"
  
  - name: "Get messages"
    weight: 60
    requests:
      - get:
          url: "/api/channels/{{ channelId }}/messages"
```

Run test:
```bash
artillery run load-test.yml
```

## 🔍 Troubleshooting

### Error: "Connection refused"
- Pastikan PostgreSQL service running
- Cek port 5432 tidak digunakan aplikasi lain
- Verifikasi firewall settings

### Error: "Database does not exist"
- Jalankan setup script: `node migrations/setup-postgres.js`
- Atau create manual menggunakan psql

### Error: "Permission denied"
- Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE discord_clone TO discord_user;`
- Pastikan user memiliki hak CREATE, INSERT, SELECT, UPDATE, DELETE

### Error: "Too many connections"
- Naikkan `max_connections` di postgresql.conf
- Turunkan `max` di connection pool config
- Restart PostgreSQL service

### Slow Query Performance
- Pastikan indexes sudah dibuat (check: `migrations/001_initial_schema.sql`)
- Jalankan `ANALYZE` untuk update statistics
- Cek query dengan `EXPLAIN ANALYZE`

## 📈 Monitoring

### PostgreSQL Statistics

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT query, calls, mean_time, total_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public';
```

### Application Logs

Monitor connection pool:
```javascript
// Add to server.js
pool.on('connect', () => console.log('New client connected'));
pool.on('acquire', () => console.log('Client acquired'));
pool.on('remove', () => console.log('Client removed'));
```

## 🌍 Production Deployment

### Environment Variables

```env
# Production PostgreSQL (e.g., AWS RDS, Railway, Supabase)
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
DB_SSL=true

# Application
JWT_SECRET=your-secure-jwt-secret
PORT=3001
NODE_ENV=production
USE_POSTGRES=true
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/discord_clone
      - USE_POSTGRES=true
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=discord_clone
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## 📝 Summary Checklist

- [ ] Backup SQLite database
- [ ] Install PostgreSQL
- [ ] Create database and user
- [ ] Install Node dependencies (`npm install`)
- [ ] Configure `.env` file
- [ ] Run schema migration
- [ ] Migrate data from SQLite
- [ ] Test application functionality
- [ ] Test with concurrent users
- [ ] Update AGENTS.md documentation

## 📚 Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [node-postgres (pg)](https://node-postgres.com/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)

---

**Note**: SQLite database tetap tersedia sebagai backup di `server/database-sqlite-backup.js`.

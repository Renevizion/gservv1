# gservv1 — Game Server Control Panel

Backend infrastructure for a game server hosting business (Minecraft, GTA 5, GTA 6).
Two services communicate through a shared Postgres database and Redis instance.

## Services

| Service | Language | Port | Purpose |
|---|---|---|---|
| `game-api-node` | Node.js / TypeScript | 3000 | Auth, server CRUD, billing, MinIO backups |
| `game-api-python` | Python / FastAPI | 5000 | Server provisioning worker, lifecycle ops |

## Architecture

```
Client → game-api-node (Express)
              ├── Postgres  (users, servers, billing)
              ├── Redis     (list cache, sessions)
              └── MinIO     (server backups)

game-api-python (FastAPI) ← called by Node API after server creation
              ├── Postgres  (shared DB)
              └── Redis     (status updates)
```

## Quick Start (local)

### Prerequisites
- Docker & Docker Compose (or local Postgres + Redis + MinIO)
- Node.js 20+
- Python 3.12+

### 1. Run the DB migration
```bash
cd game-api-node
cp .env.example .env   # fill in your values
npm install
npm run migrate        # creates users / servers / billing tables
```

### 2. Start Node API
```bash
npm run dev            # http://localhost:3000
```

### 3. Start Python worker
```bash
cd ../game-api-python
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload --port 5000
```

## API Reference

### Node API (`game-api-node`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register (email + password) |
| POST | `/auth/login` | — | Login → JWT |
| GET | `/servers` | JWT | List my servers |
| POST | `/servers` | JWT | Create server |
| GET | `/servers/:id` | JWT | Get server |
| PATCH | `/servers/:id` | JWT | Update server |
| DELETE | `/servers/:id` | JWT | Delete server |
| POST | `/servers/:id/backup` | JWT | Trigger MinIO backup |
| GET | `/billing` | JWT | List invoices |
| GET | `/billing/summary` | JWT | Total spend |
| POST | `/billing` | JWT | Create invoice |
| PATCH | `/billing/:id/pay` | JWT | Mark paid |
| GET | `/health` | — | Health check |

### Python Worker (`game-api-python`)

| Method | Path | Description |
|---|---|---|
| POST | `/servers/:id/provision` | Start provisioning |
| POST | `/servers/:id/stop` | Stop server |
| POST | `/servers/:id/restart` | Restart server |
| GET | `/servers/:id/status` | Get status |
| GET | `/health` | Health check |

## Deploying to Railway

1. **Connect repos** in the Railway dashboard:
   - `game-api-node` service → connect this repo, root directory `game-api-node`
   - `game-api-python` service → connect this repo, root directory `game-api-python`

2. **Set environment variables** on each service (Railway injects Postgres/Redis URLs automatically when you add those services):

   **game-api-node**
   ```
   JWT_SECRET=<long random string>
   MINIO_ENDPOINT=${{MinIO.RAILWAY_PRIVATE_DOMAIN}}:9000
   MINIO_ACCESS_KEY=${{MinIO.MINIO_ROOT_USER}}
   MINIO_SECRET_KEY=${{MinIO.MINIO_ROOT_PASSWORD}}
   MINIO_BUCKET=game-servers
   ```

   **game-api-python**
   ```
   (DATABASE_URL and REDIS_URL are auto-injected)
   ```

3. **Run migration** once after first deploy:
   ```
   Railway shell → game-api-node → psql $DATABASE_URL -f dist/db/init.sql
   ```

## Supported Games

- `minecraft` — default port 25565
- `gta5` — default port 30120
- `gta6` — default port 30200
- `other` — default port 27015

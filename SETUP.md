# Setup Guide

## Local Development Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

The `.env` file has been created with a generated `NEXTAUTH_SECRET`.

Edit `.env` and add your credentials:

**Database**

- Use VPS Postgres: `postgresql://user:pass@vps-ip:5432/modelarena`

**Redis**

- Local: `redis://localhost:6379/0`
- Production values will be set in Coolify

**R2 Storage**

- Get credentials from Cloudflare R2 dashboard
- Create bucket named `modelarena`
- Set up custom domain or use R2.dev URL

**OAuth App**

- Create GitHub OAuth app: https://github.com/settings/developers
  - Homepage URL: `http://localhost:3000`
  - Callback URL: `http://localhost:3000/api/auth/callback/github`

**Generate NextAuth Secret**

```bash
openssl rand -base64 32
```

### 3. Create Postgres Database

**Via Coolify:**

1. Open your Postgres service in Coolify
2. Use "Execute Command" or "Terminal"
3. Run:
   ```bash
   psql -U postgres
   CREATE DATABASE modelarena;
   \q
   ```

**Via SSH:**

```bash
ssh your-vps
docker ps | grep postgres
docker exec -it <container-name> psql -U postgres
CREATE DATABASE modelarena;
\q
```

### 4. Set Up Database Schema

```bash
# Generate Prisma client
pnpm prisma generate

# Push schema to database
pnpm db:push

# Seed initial data (models, providers)
pnpm db:seed
```

### 5. Run Development Server

```bash
pnpm dev
```

Visit http://localhost:3000

### 6. Access Admin Panel

1. Sign in with GitHub
2. Make sure your email is in `ADMIN_EMAILS` in `.env`
3. Visit http://localhost:3000/admin

---

## Production Deployment (Coolify)

### 1. Create Services in Coolify

**Postgres Database**

- Create new Postgres service
- Note connection details
- Create database: `CREATE DATABASE modelarena;`

**Redis**

- Create new Redis service
- Note connection URL

### 2. Configure Application

**In Coolify, set environment variables:**

```env
DATABASE_URL=postgresql://user:pass@postgres-service:5432/modelarena
REDIS_URL=redis://redis-service:6379
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=modelarena
R2_PUBLIC_URL=https://cdn.yourdomain.com
NEXTAUTH_URL=https://modelarena.yourdomain.com
NEXTAUTH_SECRET=<generate-new-secret>
GITHUB_ID=<production-oauth-app>
GITHUB_SECRET=<production-oauth-app>
FAL_KEY=...
RUNWAY_API_KEY=...
ADMIN_EMAILS=your-email@example.com
```

**Create production OAuth app** with production callback URL:

- GitHub: `https://modelarena.yourdomain.com/api/auth/callback/github`

### 3. Deploy

Push to your git repository connected to Coolify. Coolify will:

1. Build the application
2. Run migrations (add to build command: `pnpm prisma generate && pnpm db:push`)
3. Deploy

### 4. Run Worker (Separate Service)

Create a separate service in Coolify for the worker:

- Same environment variables
- Start command: `pnpm worker`
- This processes video generation jobs

---

## Environment Variable Priority

- **Local development**: `.env` file (gitignored)
- **Production (Coolify)**: Set environment variables in Coolify UI

---

## Troubleshooting

**"Can't connect to database"**

- Check DATABASE_URL is correct
- Verify database exists: `psql <DATABASE_URL> -c "\l"`
- Check firewall allows connection from your IP

**"Can't connect to Redis"**

- For local: `redis-cli ping` should return `PONG`
- Install Redis: `brew install redis` (Mac) or `apt install redis` (Linux)
- Start Redis: `brew services start redis` or `redis-server`

**"Not authorized" in admin panel**

- Check your GitHub email is in ADMIN_EMAILS in `.env`
- Sign out and sign in again
- Check session with: http://localhost:3000/api/auth/session

**OAuth errors**

- Verify callback URLs match exactly (including http vs https)
- Check OAuth app is active
- Verify client ID and secret are correct

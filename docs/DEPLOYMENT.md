# SEO Analyzer Pro - Deployment Guide

> Complete deployment guide for SEO Analyzer Pro

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Docker Deployment](#docker-deployment)
4. [Vercel Deployment](#vercel-deployment)
5. [Self-Hosted Deployment](#self-hosted-deployment)
6. [Database Setup](#database-setup)
7. [Redis Setup](#redis-setup)
8. [SSL/HTTPS](#sslhttps)
9. [Scaling Guide](#scaling-guide)

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 512MB | 2GB+ |
| Storage | 1GB | 10GB+ |
| Node.js | 18.x | 20.x LTS |
| npm | 9.x | 10.x |

### Required Software

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Docker** (for containerized deployment)
- **Git** (for cloning repository)

### External Services (Optional)

| Service | Purpose | Required For |
|---------|---------|--------------|
| PostgreSQL | Data persistence | Multi-user deployments |
| Redis | Caching, rate limiting | High-traffic deployments |
| S3/Cloud Storage | Report storage | PDF export feature |
| SMTP Server | Email notifications | User notifications |

---

## Environment Variables

### Core Configuration

```bash
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com

# API Keys
API_KEY_SALT=your-secure-salt-here
JWT_SECRET=your-jwt-secret-here

# Database (if using)
DATABASE_URL=postgresql://user:pass@host:5432/seoanalyzer

# Redis (if using)
REDIS_URL=redis://localhost:6379
```

### Optional Configuration

```bash
# CORS
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# External APIs
OPENAI_API_KEY=sk-xxx  # For AI-powered features
ANTHROPIC_API_KEY=sk-xxx  # For Claude integration

# Storage
STORAGE_TYPE=local  # local, s3, gcs
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
```

### Environment File Template

Create `.env` file in project root:

```bash
# Copy this file to .env and fill in your values
cp .env.example .env
```

---

## Docker Deployment

### Quick Start

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

# Set to production
ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start
CMD ["node", "dist/server.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/seoanalyzer
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=seoanalyzer
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Docker Commands

```bash
# Build image
docker build -t seo-analyzer-pro .

# Run container
docker run -p 3000:3000 --env-file .env seo-analyzer-pro

# Run with Docker Compose
docker-compose up -d

# Scale with Docker Compose
docker-compose up -d --scale app=3

# View logs
docker-compose logs -f app

# Execute command in container
docker-compose exec app sh
```

---

## Vercel Deployment

### Prerequisites

- Vercel account
- Vercel CLI (optional): `npm i -g vercel`

### Method 1: Vercel Dashboard

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your Git repository

2. **Configure Project**
   ```
   Framework Preset: Other
   Root Directory: ./
   Build Command: npm run build
   Output Directory: dist
   ```

3. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all required variables from `.env.example`

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

### Method 2: Vercel CLI

```bash
# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod

# Add environment variables
vercel env add DATABASE_URL
vercel env add REDIS_URL
```

### vercel.json Configuration

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Serverless Functions

For API endpoints, create serverless functions:

```javascript
// api/analyze.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  
  // Analysis logic here
  
  res.json({ success: true, data: analysisResults });
}
```

---

## Self-Hosted Deployment

### Ubuntu/Debian Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone https://github.com/legacyai/seo-analyzer-pro.git
cd seo-analyzer-pro

# Install dependencies
npm ci --production

# Build
npm run build

# Create environment file
cp .env.example .env
nano .env  # Edit with your values

# Start with PM2
pm2 start dist/server.js --name seo-analyzer

# Save PM2 configuration
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/seo-analyzer
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/seo-analyzer /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Systemd Service

```ini
# /etc/systemd/system/seo-analyzer.service
[Unit]
Description=SEO Analyzer Pro
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/seo-analyzer
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable seo-analyzer
sudo systemctl start seo-analyzer
```

---

## Database Setup

### PostgreSQL

#### Installation

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
```

#### Database Creation

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE seoanalyzer;
CREATE USER seo_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE seoanalyzer TO seo_user;

# Exit
\q
```

#### Schema Migration

```bash
# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

#### Schema Overview

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Analyses table
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    url VARCHAR(2048) NOT NULL,
    scores JSONB NOT NULL,
    analysis JSONB NOT NULL,
    action_items JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Redis Setup

### Installation

```bash
# Ubuntu/Debian
sudo apt install redis-server

# macOS
brew install redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Configuration

```bash
# /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Usage in Application

```javascript
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL
});

await redis.connect();

// Cache analysis results
await redis.setex(
  `analysis:${url}`,
  3600, // 1 hour
  JSON.stringify(analysis)
);

// Rate limiting
const requests = await redis.incr(`ratelimit:${userId}`);
if (requests === 1) {
  await redis.expire(`ratelimit:${userId}`, 60);
}
```

---

## SSL/HTTPS

### Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### Manual Certificate

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Scaling Guide

### Horizontal Scaling

```mermaid
graph TB
    LB[Load Balancer] --> App1[App Server 1]
    LB --> App2[App Server 2]
    LB --> App3[App Server 3]
    App1 --> Redis[(Redis)]
    App2 --> Redis
    App3 --> Redis
    App1 --> DB[(PostgreSQL)]
    App2 --> DB
    App3 --> DB
```

### Load Balancer (Nginx)

```nginx
upstream seo_analyzer {
    least_conn;
    server app1:3000 weight=1;
    server app2:3000 weight=1;
    server app3:3000 weight=1;
}

server {
    listen 80;
    location / {
        proxy_pass http://seo_analyzer;
    }
}
```

### Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: seo-analyzer
spec:
  replicas: 3
  selector:
    matchLabels:
      app: seo-analyzer
  template:
    metadata:
      labels:
        app: seo-analyzer
    spec:
      containers:
      - name: app
        image: seo-analyzer-pro:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: seo-analyzer
spec:
  selector:
    app: seo-analyzer
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Performance Optimization

| Optimization | Description |
|--------------|-------------|
| **Caching** | Cache analysis results in Redis |
| **CDN** | Serve static assets via CDN |
| **Connection Pooling** | Use pg-pool for database connections |
| **Compression** | Enable gzip/brotli compression |
| **Rate Limiting** | Implement per-user rate limits |

### Monitoring

```yaml
# Prometheus metrics endpoint
# /metrics
```

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | Change PORT in .env or kill process |
| Database connection failed | Check DATABASE_URL and credentials |
| Redis connection failed | Verify Redis is running |
| CORS errors | Add domain to CORS_ORIGINS |
| Memory issues | Increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096` |

### Logs

```bash
# PM2 logs
pm2 logs seo-analyzer

# Docker logs
docker-compose logs -f app

# Systemd logs
journalctl -u seo-analyzer -f
```

---

<div align="center">

**Deployment Support**: devops@legacyai.space

Copyright (c) 2026 Legacy AI / Floyd's Labs

www.LegacyAI.space | www.FloydsLabs.com

</div>

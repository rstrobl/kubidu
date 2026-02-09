# Connect a Database

Learn how to connect your Kubidu services to databases.

## Overview

Kubidu supports connecting to any database. This guide covers:
- PostgreSQL, MySQL, MongoDB
- Managed database services
- Connection pooling and best practices
- Secure credential management

## Quick Start

```bash
# Set your database URL as a secret
kubidu env set DATABASE_URL="postgres://user:pass@host:5432/db" --secret

# Deploy your app
kubidu deploy
```

## Database Options

### Option 1: External Managed Databases

Connect to managed database services:

| Provider | Database Types | EU Regions |
|----------|---------------|------------|
| Neon | PostgreSQL | ✅ Frankfurt |
| PlanetScale | MySQL | ✅ Frankfurt |
| MongoDB Atlas | MongoDB | ✅ Frankfurt |
| Supabase | PostgreSQL | ✅ Frankfurt |
| Railway | PostgreSQL, MySQL, Redis | ✅ EU |
| Upstash | Redis, Kafka | ✅ Frankfurt |

### Option 2: Self-Hosted

Host your own database on any cloud provider and connect via:
- VPC peering (Enterprise plan)
- Public IP with firewall rules
- SSH tunnel

## PostgreSQL

### Neon (Recommended for Serverless)

1. Create database at [neon.tech](https://neon.tech)
2. Get connection string
3. Add to Kubidu:

```bash
kubidu env set DATABASE_URL="postgres://user:pass@ep-xyz.eu-central-1.aws.neon.tech/neondb?sslmode=require" --secret
```

### Supabase

```bash
# From Supabase dashboard → Settings → Database
kubidu env set DATABASE_URL="postgres://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" --secret
```

### Application Code (Node.js)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // For most managed DBs
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
```

### Application Code (Python)

```python
import os
from sqlalchemy import create_engine

engine = create_engine(
    os.environ['DATABASE_URL'],
    pool_size=5,
    pool_recycle=3600
)
```

## MySQL

### PlanetScale

1. Create database at [planetscale.com](https://planetscale.com)
2. Get connection string from dashboard
3. Add to Kubidu:

```bash
kubidu env set DATABASE_URL="mysql://user:pass@aws.connect.psdb.cloud/mydb?ssl={'rejectUnauthorized':true}" --secret
```

### Application Code (Node.js)

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
});

const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
```

## MongoDB

### MongoDB Atlas

1. Create cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Choose EU region (Frankfurt)
3. Get connection string
4. Add to Kubidu:

```bash
kubidu env set MONGODB_URI="mongodb+srv://user:pass@cluster.xyz.mongodb.net/mydb?retryWrites=true&w=majority" --secret
```

### Application Code (Node.js)

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);

async function connect() {
  await client.connect();
  const db = client.db('myapp');
  return db;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await client.close();
  process.exit(0);
});
```

## Redis

### Upstash (Serverless Redis)

1. Create database at [upstash.com](https://upstash.com)
2. Choose EU region
3. Get connection details:

```bash
kubidu env set REDIS_URL="redis://default:pass@eu1-xyz.upstash.io:6379" --secret
```

### Application Code (Node.js)

```javascript
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

// Set/get
await redis.set('key', 'value');
const value = await redis.get('key');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redis.quit();
  process.exit(0);
});
```

## Connection Pooling

### Why Pool Connections?

Without pooling:
- ❌ New connection per request (slow)
- ❌ Connection limit reached quickly
- ❌ Database overwhelmed

With pooling:
- ✅ Reuse existing connections
- ✅ Better performance
- ✅ Scalable

### Pool Configuration

```yaml
# kubidu.yaml - example for pgBouncer
env:
  PGBOUNCER_MAX_CONNECTIONS: "100"
  PGBOUNCER_DEFAULT_POOL_SIZE: "20"
```

### Node.js Pool Example

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // Pool settings
  max: 20,                      // Max connections per instance
  min: 5,                       // Keep minimum connections open
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Connection timeout
});

// Health check
async function checkDb() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } catch (err) {
    return false;
  } finally {
    client.release();
  }
}
```

## Connection Strings

### Format

```
protocol://username:password@host:port/database?options
```

### Examples

```bash
# PostgreSQL
postgres://user:pass@host:5432/mydb?sslmode=require

# MySQL
mysql://user:pass@host:3306/mydb?charset=utf8mb4

# MongoDB
mongodb+srv://user:pass@cluster.mongodb.net/mydb?retryWrites=true

# Redis
redis://default:pass@host:6379

# Redis with TLS
rediss://default:pass@host:6379
```

## Security Best Practices

### 1. Always Use Secrets

```bash
# ✅ Good - encrypted at rest
kubidu env set DATABASE_URL="..." --secret

# ❌ Bad - not encrypted
kubidu env set DATABASE_URL="..."
```

### 2. Use SSL/TLS

```javascript
// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});
```

### 3. Least Privilege

Create database users with minimal permissions:

```sql
-- PostgreSQL
CREATE USER app_user WITH PASSWORD 'secret';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- Don't grant DROP, CREATE TABLE, etc.
```

### 4. IP Whitelisting

If your database supports it, whitelist Kubidu egress IPs:

```bash
# Get Kubidu egress IPs
kubidu info --egress-ips

# Whitelist in your database
# (varies by provider)
```

## Migrations

### Run Migrations on Deploy

```yaml
# kubidu.yaml
deploy:
  build_command: npm run migrate && npm run build
```

### Separate Migration Job

```bash
# Create a one-off job for migrations
kubidu run "npm run db:migrate"
```

### Example: Prisma

```bash
# In package.json
{
  "scripts": {
    "db:migrate": "prisma migrate deploy",
    "db:generate": "prisma generate",
    "build": "npm run db:generate && tsc"
  }
}
```

## Troubleshooting

### Connection Refused

1. Check database is publicly accessible or VPC peered
2. Verify IP whitelist includes Kubidu
3. Check firewall rules

```bash
# Test connection locally
psql $DATABASE_URL
```

### Connection Timeout

1. Check database host is correct
2. Verify port is open
3. Increase connection timeout:

```javascript
const pool = new Pool({
  connectionTimeoutMillis: 10000, // 10 seconds
});
```

### Too Many Connections

1. Reduce pool size per instance
2. Use connection pooler (pgBouncer, ProxySQL)
3. Scale database tier

```javascript
// If running 5 replicas with max 20 connections each
// = 100 connections to database
const pool = new Pool({ max: 10 }); // Reduce to 10
```

### SSL Certificate Error

```javascript
// For self-signed or specific CA
const pool = new Pool({
  ssl: {
    rejectUnauthorized: false, // Not recommended for production
    // OR
    ca: fs.readFileSync('/path/to/ca.pem'),
  }
});
```

## Multi-Environment Setup

```bash
# Production
kubidu env set DATABASE_URL="postgres://prod..." --secret --env production

# Staging
kubidu env set DATABASE_URL="postgres://staging..." --secret --env staging

# Development
kubidu env set DATABASE_URL="postgres://dev..." --secret --env development
```

## Example: Full Setup

```javascript
// db.js
const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false }
        : false,
      max: parseInt(process.env.DB_POOL_SIZE || '10'),
      idleTimeoutMillis: 30000,
    });
    
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }
  return pool;
}

async function query(text, params) {
  const start = Date.now();
  const result = await getPool().query(text, params);
  const duration = Date.now() - start;
  console.log('Query executed', { text, duration, rows: result.rowCount });
  return result;
}

async function healthCheck() {
  try {
    await getPool().query('SELECT 1');
    return { status: 'healthy' };
  } catch (err) {
    return { status: 'unhealthy', error: err.message };
  }
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { query, healthCheck, close };
```

## See Also

- [Environment Variables](./variables.md)
- [Environment Variables Best Practices](./env-variables-best-practices.md)
- [Deploy Node.js App](./nodejs-deployment.md)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  {
    name: 'PostgreSQL',
    slug: 'postgresql',
    description: 'PostgreSQL 16 database with persistent storage',
    icon: '🐘',
    category: 'database',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'postgres',
          image: 'postgres:16-alpine',
          volumes: [{ name: 'data', mountPath: '/var/lib/postgresql/data', size: '10Gi' }],
          env: {
            POSTGRES_USER: { input: { label: 'Database User', default: 'kubidu' } },
            POSTGRES_PASSWORD: { generated: 'password', length: 32 },
            POSTGRES_DB: { input: { label: 'Database Name', default: 'app' } },
          },
          ports: [5432],
          healthCheck: {
            command: ['pg_isready', '-U', '${POSTGRES_USER}'],
            interval: 10,
            timeout: 5,
            retries: 5,
          },
          exports: ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'DATABASE_URL'],
        },
      ],
    },
  },
  {
    name: 'Redis',
    slug: 'redis',
    description: 'Redis 7 in-memory cache with persistence',
    icon: '⚡',
    category: 'cache',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'redis',
          image: 'redis:7-alpine',
          volumes: [{ name: 'data', mountPath: '/data', size: '5Gi' }],
          env: {
            REDIS_PASSWORD: { generated: 'password', length: 32 },
          },
          ports: [6379],
          command: ['redis-server', '--appendonly', 'yes', '--requirepass', '${REDIS_PASSWORD}'],
          healthCheck: {
            command: ['redis-cli', '-a', '${REDIS_PASSWORD}', 'ping'],
            interval: 10,
            timeout: 5,
            retries: 5,
          },
          exports: ['REDIS_PASSWORD', 'REDIS_URL'],
        },
      ],
    },
  },
  {
    name: 'MongoDB',
    slug: 'mongodb',
    description: 'MongoDB 7 document database',
    icon: '🍃',
    category: 'database',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'mongodb',
          image: 'mongo:7',
          volumes: [{ name: 'data', mountPath: '/data/db', size: '10Gi' }],
          env: {
            MONGO_INITDB_ROOT_USERNAME: { input: { label: 'Root Username', default: 'admin' } },
            MONGO_INITDB_ROOT_PASSWORD: { generated: 'password', length: 32 },
            MONGO_INITDB_DATABASE: { input: { label: 'Database Name', default: 'app' } },
          },
          ports: [27017],
          exports: ['MONGO_INITDB_ROOT_USERNAME', 'MONGO_INITDB_ROOT_PASSWORD', 'MONGO_INITDB_DATABASE', 'MONGODB_URL'],
        },
      ],
    },
  },
  {
    name: 'Node.js Starter',
    slug: 'nodejs-starter',
    description: 'Express.js API starter with health checks',
    icon: '🟢',
    category: 'backend',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'api',
          image: 'node:20-alpine',
          env: {
            NODE_ENV: { value: 'production' },
            PORT: { value: '3000' },
            API_SECRET: { generated: 'password', length: 64 },
          },
          ports: [3000],
          healthCheck: {
            path: '/health',
            interval: 10,
            timeout: 5,
            retries: 3,
          },
        },
      ],
    },
  },
  {
    name: 'Python Flask',
    slug: 'python-flask',
    description: 'Flask API with Gunicorn WSGI server',
    icon: '🐍',
    category: 'backend',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'api',
          image: 'python:3.12-slim',
          env: {
            FLASK_ENV: { value: 'production' },
            SECRET_KEY: { generated: 'password', length: 64 },
            GUNICORN_WORKERS: { value: '4' },
          },
          ports: [8000],
          healthCheck: {
            path: '/health',
            interval: 10,
            timeout: 5,
            retries: 3,
          },
        },
      ],
    },
  },
  {
    name: 'Go Fiber',
    slug: 'go-fiber',
    description: 'Fiber web framework starter',
    icon: '🐹',
    category: 'backend',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'api',
          image: 'golang:1.22-alpine',
          env: {
            GIN_MODE: { value: 'release' },
            PORT: { value: '3000' },
            API_SECRET: { generated: 'password', length: 64 },
          },
          ports: [3000],
          healthCheck: {
            path: '/health',
            interval: 10,
            timeout: 5,
            retries: 3,
          },
        },
      ],
    },
  },
  {
    name: 'MySQL',
    slug: 'mysql',
    description: 'MySQL 8 relational database',
    icon: '🐬',
    category: 'database',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'mysql',
          image: 'mysql:8',
          volumes: [{ name: 'data', mountPath: '/var/lib/mysql', size: '10Gi' }],
          env: {
            MYSQL_ROOT_PASSWORD: { generated: 'password', length: 32 },
            MYSQL_USER: { input: { label: 'Database User', default: 'kubidu' } },
            MYSQL_PASSWORD: { generated: 'password', length: 32 },
            MYSQL_DATABASE: { input: { label: 'Database Name', default: 'app' } },
          },
          ports: [3306],
          exports: ['MYSQL_ROOT_PASSWORD', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE', 'DATABASE_URL'],
        },
      ],
    },
  },
  {
    name: 'MinIO',
    slug: 'minio',
    description: 'S3-compatible object storage',
    icon: '🗄️',
    category: 'storage',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'minio',
          image: 'minio/minio:latest',
          volumes: [{ name: 'data', mountPath: '/data', size: '50Gi' }],
          env: {
            MINIO_ROOT_USER: { input: { label: 'Access Key', default: 'minioadmin' } },
            MINIO_ROOT_PASSWORD: { generated: 'password', length: 32 },
          },
          ports: [9000, 9001],
          command: ['server', '/data', '--console-address', ':9001'],
          exports: ['MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD', 'S3_ENDPOINT'],
        },
      ],
    },
  },
];

async function main() {
  console.log('🌱 Seeding templates...');

  for (const template of templates) {
    const existing = await prisma.template.findUnique({
      where: { slug: template.slug },
    });

    if (existing) {
      console.log(`  ⏭️  Skipping ${template.name} (already exists)`);
      continue;
    }

    await prisma.template.create({
      data: template,
    });

    console.log(`  ✅ Created ${template.name}`);
  }

  console.log('\n🎉 Template seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

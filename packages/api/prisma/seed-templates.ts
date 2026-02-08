import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  {
    name: 'PostgreSQL',
    slug: 'postgresql',
    description: 'PostgreSQL database with persistent storage',
    icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',
    category: 'database',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'postgresql',
          image: 'postgres',
          tag: '16-alpine',
          port: 5432,
          env: {
            POSTGRES_USER: { input: { label: 'Database User', default: 'postgres' } },
            POSTGRES_PASSWORD: { generate: 'secret' as const },
            POSTGRES_DB: { input: { label: 'Database Name', default: 'app' } },
          },
          volumes: [
            { name: 'data', mountPath: '/var/lib/postgresql/data', size: '10Gi' },
          ],
          memoryLimit: '512Mi',
          cpuLimit: '500m',
        },
      ],
    },
  },
  {
    name: 'MySQL',
    slug: 'mysql',
    description: 'MySQL database with persistent storage',
    icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
    category: 'database',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'mysql',
          image: 'mysql',
          tag: '8.0',
          port: 3306,
          env: {
            MYSQL_ROOT_PASSWORD: { generate: 'secret' as const },
            MYSQL_DATABASE: { input: { label: 'Database Name', default: 'app' } },
            MYSQL_USER: { input: { label: 'Database User', default: 'app' } },
            MYSQL_PASSWORD: { generate: 'secret' as const },
          },
          volumes: [
            { name: 'data', mountPath: '/var/lib/mysql', size: '10Gi' },
          ],
          memoryLimit: '512Mi',
          cpuLimit: '500m',
        },
      ],
    },
  },
  {
    name: 'Redis',
    slug: 'redis',
    description: 'Redis in-memory data store with authentication',
    icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg',
    category: 'cache',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'redis',
          image: 'redis',
          tag: '7-alpine',
          port: 6379,
          command: ['/bin/sh', '-c', 'redis-server --appendonly yes --requirepass "$REDIS_PASSWORD"'],
          env: {
            REDIS_PASSWORD: { generate: 'secret' as const },
          },
          volumes: [
            { name: 'data', mountPath: '/data', size: '1Gi' },
          ],
          memoryLimit: '256Mi',
          cpuLimit: '250m',
        },
      ],
    },
  },
  {
    name: 'MongoDB',
    slug: 'mongodb',
    description: 'MongoDB document database',
    icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
    category: 'database',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'mongodb',
          image: 'mongo',
          tag: '7',
          port: 27017,
          env: {
            MONGO_INITDB_ROOT_USERNAME: { input: { label: 'Root Username', default: 'admin' } },
            MONGO_INITDB_ROOT_PASSWORD: { generate: 'secret' as const },
          },
          volumes: [
            { name: 'data', mountPath: '/data/db', size: '10Gi' },
          ],
          memoryLimit: '512Mi',
          cpuLimit: '500m',
        },
      ],
    },
  },
  {
    name: 'WordPress',
    slug: 'wordpress',
    description: 'WordPress with MySQL database',
    icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/wordpress/wordpress-plain.svg',
    category: 'cms',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'MySQL',
          image: 'mysql',
          tag: '8.0',
          port: 3306,
          env: {
            MYSQL_ROOT_PASSWORD: { generate: 'secret' as const },
            MYSQL_DATABASE: 'wordpress',
            MYSQL_USER: 'wordpress',
            MYSQL_PASSWORD: { generate: 'secret' as const },
          },
          volumes: [
            { name: 'data', mountPath: '/var/lib/mysql', size: '10Gi' },
          ],
          memoryLimit: '512Mi',
          cpuLimit: '500m',
        },
        {
          name: 'WordPress',
          image: 'wordpress',
          tag: 'latest',
          port: 80,
          public: true,
          env: {
            WORDPRESS_DB_HOST: { ref: 'MySQL.hostname' },
            WORDPRESS_DB_USER: 'wordpress',
            WORDPRESS_DB_PASSWORD: { ref: 'MySQL.env.MYSQL_PASSWORD' },
            WORDPRESS_DB_NAME: 'wordpress',
          },
          volumes: [
            { name: 'content', mountPath: '/var/www/html/wp-content', size: '5Gi' },
          ],
          memoryLimit: '512Mi',
          cpuLimit: '500m',
        },
      ],
    },
  },
  {
    name: 'n8n',
    slug: 'n8n',
    description: 'n8n workflow automation with PostgreSQL',
    icon: 'https://n8n.io/favicon.ico',
    category: 'automation',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'PostgreSQL',
          image: 'postgres',
          tag: '16-alpine',
          port: 5432,
          env: {
            POSTGRES_USER: 'n8n',
            POSTGRES_PASSWORD: { generate: 'secret' as const },
            POSTGRES_DB: 'n8n',
          },
          volumes: [
            { name: 'data', mountPath: '/var/lib/postgresql/data', size: '5Gi' },
          ],
          memoryLimit: '256Mi',
          cpuLimit: '250m',
        },
        {
          name: 'n8n',
          image: 'n8nio/n8n',
          tag: 'latest',
          port: 5678,
          public: true,
          env: {
            DB_TYPE: 'postgresdb',
            DB_POSTGRESDB_HOST: { ref: 'PostgreSQL.hostname' },
            DB_POSTGRESDB_PORT: '5432',
            DB_POSTGRESDB_DATABASE: 'n8n',
            DB_POSTGRESDB_USER: 'n8n',
            DB_POSTGRESDB_PASSWORD: { ref: 'PostgreSQL.env.POSTGRES_PASSWORD' },
            N8N_ENCRYPTION_KEY: { generate: 'secret' as const },
          },
          volumes: [
            { name: 'data', mountPath: '/home/node/.n8n', size: '1Gi' },
          ],
          memoryLimit: '512Mi',
          cpuLimit: '500m',
        },
      ],
    },
  },
  {
    name: 'Ghost',
    slug: 'ghost',
    description: 'Ghost publishing platform with MySQL',
    icon: 'https://ghost.org/favicon.ico',
    category: 'cms',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'MySQL',
          image: 'mysql',
          tag: '8.0',
          port: 3306,
          env: {
            MYSQL_ROOT_PASSWORD: { generate: 'secret' as const },
            MYSQL_DATABASE: 'ghost',
            MYSQL_USER: 'ghost',
            MYSQL_PASSWORD: { generate: 'secret' as const },
          },
          volumes: [
            { name: 'data', mountPath: '/var/lib/mysql', size: '10Gi' },
          ],
          memoryLimit: '512Mi',
          cpuLimit: '500m',
        },
        {
          name: 'Ghost',
          image: 'ghost',
          tag: '5-alpine',
          port: 2368,
          public: true,
          env: {
            url: { input: { label: 'Site URL (e.g., https://blog.example.com)', default: 'http://localhost:2368' } },
            database__client: 'mysql',
            database__connection__host: { ref: 'MySQL.hostname' },
            database__connection__port: '3306',
            database__connection__user: { ref: 'MySQL.env.MYSQL_USER' },
            database__connection__password: { ref: 'MySQL.env.MYSQL_PASSWORD' },
            database__connection__database: { ref: 'MySQL.env.MYSQL_DATABASE' },
            NODE_ENV: 'production',
          },
          volumes: [
            { name: 'content', mountPath: '/var/lib/ghost/content', size: '5Gi' },
          ],
          memoryLimit: '512Mi',
          cpuLimit: '500m',
        },
      ],
    },
  },
  {
    name: 'Prefect',
    slug: 'prefect',
    description: 'Prefect workflow orchestration with PostgreSQL',
    icon: 'https://api.iconify.design/simple-icons/prefect.svg',
    category: 'automation',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'PostgreSQL',
          image: 'postgres',
          tag: '16-alpine',
          port: 5432,
          env: {
            POSTGRES_USER: 'prefect',
            POSTGRES_PASSWORD: { generate: 'secret' as const },
            POSTGRES_DB: 'prefect',
          },
          volumes: [
            { name: 'data', mountPath: '/var/lib/postgresql/data', size: '5Gi' },
          ],
          memoryLimit: '256Mi',
          cpuLimit: '250m',
        },
        {
          name: 'Prefect',
          image: 'prefecthq/prefect',
          tag: '3-python3.12',
          port: 4200,
          public: true,
          command: ['prefect', 'server', 'start'],
          env: {
            PREFECT_SERVER_API_HOST: '0.0.0.0',
            PREFECT_SERVER_API_PORT: '4200',
            PREFECT_API_URL: { input: { label: 'Public URL (e.g., https://prefect.example.com/api)', default: 'http://localhost:4200/api' } },
            PREFECT_API_DATABASE_CONNECTION_URL: { ref: 'PostgreSQL.connection_url' },
          },
          volumes: [
            { name: 'data', mountPath: '/root/.prefect', size: '1Gi' },
          ],
          memoryLimit: '1Gi',
          cpuLimit: '1000m',
        },
      ],
    },
  },
  {
    name: 'Directus',
    slug: 'directus',
    description: 'Directus headless CMS with PostgreSQL',
    icon: 'https://raw.githubusercontent.com/directus/directus/main/app/public/favicon.ico',
    category: 'cms',
    isOfficial: true,
    isPublic: true,
    definition: {
      services: [
        {
          name: 'PostgreSQL',
          image: 'postgres',
          tag: '16-alpine',
          port: 5432,
          env: {
            POSTGRES_USER: 'directus',
            POSTGRES_PASSWORD: { generate: 'secret' as const },
            POSTGRES_DB: 'directus',
          },
          volumes: [
            { name: 'data', mountPath: '/var/lib/postgresql/data', size: '10Gi' },
          ],
          memoryLimit: '256Mi',
          cpuLimit: '250m',
        },
        {
          name: 'Directus',
          image: 'directus/directus',
          tag: 'latest',
          port: 8055,
          public: true,
          env: {
            PUBLIC_URL: { input: { label: 'Public URL (e.g., https://cms.example.com)', default: 'http://localhost:8055' } },
            KEY: { generate: 'secret' as const },
            SECRET: { generate: 'secret' as const },
            DB_CLIENT: 'pg',
            DB_HOST: { ref: 'PostgreSQL.hostname' },
            DB_PORT: '5432',
            DB_DATABASE: 'directus',
            DB_USER: 'directus',
            DB_PASSWORD: { ref: 'PostgreSQL.env.POSTGRES_PASSWORD' },
            ADMIN_EMAIL: { input: { label: 'Admin Email', default: 'admin@example.com' } },
            ADMIN_PASSWORD: { generate: 'secret' as const },
          },
          volumes: [
            { name: 'uploads', mountPath: '/directus/uploads', size: '10Gi' },
          ],
          memoryLimit: '512Mi',
          cpuLimit: '500m',
        },
      ],
    },
  },
];

async function main() {
  console.log('Seeding templates...');

  for (const template of templates) {
    await prisma.template.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        icon: template.icon,
        category: template.category,
        isOfficial: template.isOfficial,
        isPublic: template.isPublic,
        definition: template.definition,
      },
      create: template,
    });
    console.log(`  - ${template.name}`);
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

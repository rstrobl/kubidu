export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_URL?.split('@')[1]?.split(':')[0] || 'localhost',
    port: parseInt(process.env.REDIS_URL?.split('@')[1]?.split(':')[1] || '6379', 10),
    password: process.env.REDIS_URL?.split(':')[2]?.split('@')[0] || undefined,
  },

  docker: {
    socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
  },

  registry: {
    url: process.env.REGISTRY_URL || 'localhost:5000',
  },

  build: {
    workdir: process.env.BUILD_WORKDIR || '/tmp/kubidu-builds',
    timeout: parseInt(process.env.BUILD_TIMEOUT_SECONDS || '1800', 10) * 1000,
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_BUILDS || '3', 10),
  },

  github: {
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

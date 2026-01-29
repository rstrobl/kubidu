export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '1h',
    refreshExpiresIn: '30d',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  kubernetes: {
    kubeconfigPath: process.env.K8S_KUBECONFIG_PATH || '/kubeconfig/kubeconfig.yaml',
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'minio',
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    accessKey: process.env.MINIO_ACCESS_KEY || 'kubidu',
    secretKey: process.env.MINIO_SECRET_KEY,
    useSSL: process.env.MINIO_USE_SSL === 'true',
  },

  domain: {
    defaultSuffix: process.env.DEFAULT_DOMAIN_SUFFIX || 'kubidu.local',
  },

  deployController: {
    url: process.env.DEPLOY_CONTROLLER_URL || 'http://deploy-controller:3002',
  },

  github: {
    appId: process.env.GITHUB_APP_ID,
    clientId: process.env.GITHUB_APP_CLIENT_ID,
    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    appName: process.env.GITHUB_APP_NAME || 'kubidu',
    callbackUrl: process.env.GITHUB_APP_CALLBACK_URL || 'http://localhost:5173/github/callback',
  },
});

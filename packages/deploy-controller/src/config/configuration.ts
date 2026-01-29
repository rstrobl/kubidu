export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },

  k8s: {
    kubeconfigPath: process.env.K8S_KUBECONFIG_PATH,
    inCluster: process.env.K8S_IN_CLUSTER === 'true',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },

  domain: {
    suffix: process.env.DEFAULT_DOMAIN_SUFFIX || 'kubidu.local',
  },
});

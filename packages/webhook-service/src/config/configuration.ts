export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.WEBHOOK_PORT || '3001', 10),

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_URL?.split(':')[1]?.replace('//', '') || 'localhost',
    port: parseInt(process.env.REDIS_URL?.split(':')[2]?.split('/')[0] || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  github: {
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  },

  gitlab: {
    webhookSecret: process.env.GITLAB_WEBHOOK_SECRET,
  },
});

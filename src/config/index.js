import dotenv from 'dotenv';
dotenv.config();

export default {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600'),
  },
  
  auth: {
    type: process.env.AUTH_TYPE || 'basic',
    username: process.env.AUTH_USERNAME || 'admin',
    password: process.env.AUTH_PASSWORD || 'changeme',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  crawler: {
    defaultMaxUrls: parseInt(process.env.DEFAULT_MAX_URLS || '10000'),
    defaultCrawlDepth: parseInt(process.env.DEFAULT_CRAWL_DEPTH || '3'),
    defaultConcurrency: parseInt(process.env.DEFAULT_CONCURRENCY || '5'),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '10000'),
    userAgent: process.env.USER_AGENT || 'SitemapGenerator/1.0',
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

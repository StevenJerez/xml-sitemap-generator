import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import crawlerService from '../services/crawler.service.js';
import sitemapService from '../services/sitemap.service.js';
import cacheService from '../services/cache.service.js';
import authService from '../services/auth.service.js';
import config from '../config/index.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Store active jobs in memory (in production, use Redis)
const activeJobs = new Map();

// Login endpoint (for JWT authentication)
router.post('/auth/login', (req, res) => {
  if (config.auth.type !== 'jwt') {
    return res.status(400).json({
      error: 'JWT authentication not enabled',
      message: 'Please use Basic authentication',
    });
  }

  const { username, password } = req.body;

  if (!authService.validateBasicAuth(username, password)) {
    return res.status(401).json({
      error: 'Invalid credentials',
    });
  }

  const token = authService.generateToken(username);

  res.json({
    token,
    expiresIn: config.auth.jwtExpiresIn,
  });
});

// Generate sitemap endpoint
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { url, maxUrls, crawlDepth, concurrency } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required',
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid URL format',
      });
    }

    const options = {
      maxUrls: maxUrls || config.crawler.defaultMaxUrls,
      crawlDepth: crawlDepth || config.crawler.defaultCrawlDepth,
      concurrency: concurrency || config.crawler.defaultConcurrency,
    };

    // Check cache
    const cacheKey = cacheService.generateCacheKey(url, options);
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json({
        cached: true,
        ...cached,
      });
    }

    // Create job
    const jobId = uuidv4();
    activeJobs.set(jobId, {
      id: jobId,
      url,
      options,
      status: 'running',
      progress: [],
      startedAt: new Date().toISOString(),
    });

    // Start crawling in background
    (async () => {
      try {
        const job = activeJobs.get(jobId);
        
        const urls = await crawlerService.crawl(url, options, (progress) => {
          if (job) {
            job.progress.push(progress);
            // Broadcast progress via WebSocket (handled in server.js)
            global.wss?.clients.forEach((client) => {
              if (client.jobId === jobId && client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'progress',
                  jobId,
                  data: progress,
                }));
              }
            });
          }
        });

        const result = sitemapService.generateSitemaps(urls);
        
        if (job) {
          job.status = 'completed';
          job.result = result;
          job.completedAt = new Date().toISOString();
          job.urlCount = urls.length;

          // Cache result
          await cacheService.set(cacheKey, {
            jobId,
            result,
            urlCount: urls.length,
            completedAt: job.completedAt,
          });

          // Notify completion
          global.wss?.clients.forEach((client) => {
            if (client.jobId === jobId && client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'completed',
                jobId,
                data: {
                  urlCount: urls.length,
                  sitemapCount: result.sitemaps.length,
                  hasIndex: !!result.index,
                },
              }));
            }
          });
        }
      } catch (error) {
        const job = activeJobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.error = error.message;
          job.completedAt = new Date().toISOString();

          // Notify error
          global.wss?.clients.forEach((client) => {
            if (client.jobId === jobId && client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'error',
                jobId,
                data: { error: error.message },
              }));
            }
          });
        }
      }
    })();

    res.json({
      jobId,
      status: 'started',
      message: 'Crawling started. Connect via WebSocket for real-time updates.',
    });

  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Get job status
router.get('/status/:jobId', authenticate, (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
    });
  }

  const response = {
    jobId: job.id,
    status: job.status,
    url: job.url,
    options: job.options,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };

  if (job.status === 'completed') {
    response.urlCount = job.urlCount;
    response.sitemapCount = job.result.sitemaps.length;
    response.hasIndex = !!job.result.index;
  }

  if (job.status === 'failed') {
    response.error = job.error;
  }

  res.json(response);
});

// Download sitemap
router.get('/download/:jobId', authenticate, (req, res) => {
  const { jobId } = req.params;
  const { file } = req.query;
  
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
    });
  }

  if (job.status !== 'completed') {
    return res.status(400).json({
      error: 'Job not completed yet',
    });
  }

  // If index exists and no specific file requested, return index
  if (!file && job.result.index) {
    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="${job.result.index.name}"`);
    return res.send(job.result.index.content);
  }

  // Find requested file
  const sitemap = file 
    ? job.result.sitemaps.find(s => s.name === file)
    : job.result.sitemaps[0];

  if (!sitemap) {
    return res.status(404).json({
      error: 'Sitemap file not found',
    });
  }

  res.set('Content-Type', 'application/xml');
  res.set('Content-Disposition', `attachment; filename="${sitemap.name}"`);
  res.send(sitemap.content);
});

// Get available sitemaps for a job
router.get('/sitemaps/:jobId', authenticate, (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
    });
  }

  if (job.status !== 'completed') {
    return res.status(400).json({
      error: 'Job not completed yet',
    });
  }

  const files = job.result.sitemaps.map(s => ({
    name: s.name,
    size: Buffer.byteLength(s.content, 'utf8'),
  }));

  if (job.result.index) {
    files.unshift({
      name: job.result.index.name,
      size: Buffer.byteLength(job.result.index.content, 'utf8'),
      isIndex: true,
    });
  }

  res.json({
    jobId,
    files,
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: cacheService.isConnected,
  });
});

export default router;

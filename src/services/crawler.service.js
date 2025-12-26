import axios from 'axios';
import { load } from 'cheerio';
import robotsParser from 'robots-parser';
import { URL } from 'url';
import config from '../config/index.js';

class CrawlerService {
  constructor() {
    this.userAgent = config.crawler.userAgent;
    this.timeout = config.crawler.requestTimeout;
  }

  async crawl(startUrl, options, progressCallback) {
    const {
      maxUrls = config.crawler.defaultMaxUrls,
      crawlDepth = config.crawler.defaultCrawlDepth,
      concurrency = config.crawler.defaultConcurrency,
    } = options;

    const discovered = new Set();
    const visited = new Set();
    const queue = [{ url: startUrl, depth: 0 }];
    const results = [];
    const baseUrl = new URL(startUrl);
    
    // Fetch and parse robots.txt
    const robotsTxt = await this.fetchRobotsTxt(baseUrl.origin);
    const robots = robotsParser(`${baseUrl.origin}/robots.txt`, robotsTxt);

    discovered.add(startUrl);

    while (queue.length > 0 && results.length < maxUrls) {
      // Process URLs in batches (concurrency)
      const batch = queue.splice(0, concurrency);
      const promises = batch.map(item => 
        this.processUrl(item, baseUrl, robots, crawlDepth, discovered, visited, results, progressCallback)
      );

      await Promise.allSettled(promises);

      // Add new discovered URLs to queue
      for (const url of discovered) {
        if (!visited.has(url) && results.length < maxUrls) {
          const depth = this.getUrlDepth(url, startUrl);
          if (depth <= crawlDepth) {
            queue.push({ url, depth });
          }
        }
      }
    }

    return results;
  }

  async processUrl(item, baseUrl, robots, maxDepth, discovered, visited, results, progressCallback) {
    const { url, depth } = item;

    if (visited.has(url) || depth > maxDepth) {
      return;
    }

    visited.add(url);

    try {
      // Check robots.txt
      if (!robots.isAllowed(url, this.userAgent)) {
        progressCallback({
          type: 'skipped',
          url,
          reason: 'Blocked by robots.txt',
          discovered: discovered.size,
          visited: visited.size,
        });
        return;
      }

      // Fetch URL
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
        timeout: this.timeout,
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      });

      // Only process HTML pages
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        return;
      }

      // Add to results
      results.push({
        url,
        lastmod: new Date().toISOString(),
        changefreq: this.determineChangefreq(depth),
        priority: this.determinePriority(depth, url, baseUrl.origin),
      });

      progressCallback({
        type: 'crawled',
        url,
        depth,
        discovered: discovered.size,
        visited: visited.size,
        total: results.length,
      });

      // Extract links
      const $ = load(response.data);
      const links = this.extractLinks($, url, baseUrl.origin);
      
      for (const link of links) {
        if (!discovered.has(link)) {
          discovered.add(link);
        }
      }

    } catch (error) {
      progressCallback({
        type: 'error',
        url,
        error: error.message,
        discovered: discovered.size,
        visited: visited.size,
      });
    }
  }

  extractLinks($, currentUrl, baseOrigin) {
    const links = new Set();
    const currentUrlObj = new URL(currentUrl);

    $('a[href]').each((_, element) => {
      try {
        const href = $(element).attr('href');
        if (!href) return;

        // Resolve relative URLs
        const absoluteUrl = new URL(href, currentUrl);

        // Only include URLs from the same origin
        if (absoluteUrl.origin !== baseOrigin) return;

        // Remove hash fragments
        absoluteUrl.hash = '';

        // Skip common non-HTML resources
        const path = absoluteUrl.pathname.toLowerCase();
        if (this.shouldSkipUrl(path)) return;

        links.add(absoluteUrl.href);
      } catch (error) {
        // Invalid URL, skip
      }
    });

    return Array.from(links);
  }

  shouldSkipUrl(path) {
    const skipExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx',
      '.zip', '.rar', '.tar', '.gz',
      '.mp4', '.avi', '.mov', '.mp3', '.wav',
      '.css', '.js', '.json', '.xml'
    ];

    return skipExtensions.some(ext => path.endsWith(ext));
  }

  async fetchRobotsTxt(origin) {
    try {
      const response = await axios.get(`${origin}/robots.txt`, {
        timeout: this.timeout,
        validateStatus: (status) => status === 200,
      });
      return response.data;
    } catch (error) {
      // If robots.txt doesn't exist, return empty (allow all)
      return '';
    }
  }

  getUrlDepth(url, startUrl) {
    const urlObj = new URL(url);
    const startUrlObj = new URL(startUrl);
    
    const urlPath = urlObj.pathname.split('/').filter(Boolean);
    const startPath = startUrlObj.pathname.split('/').filter(Boolean);
    
    return Math.max(0, urlPath.length - startPath.length);
  }

  determineChangefreq(depth) {
    if (depth === 0) return 'daily';
    if (depth === 1) return 'weekly';
    return 'monthly';
  }

  determinePriority(depth, url, baseOrigin) {
    // Homepage gets highest priority
    const urlObj = new URL(url);
    if (urlObj.pathname === '/' || urlObj.pathname === '') {
      return '1.0';
    }

    // Priority decreases with depth
    if (depth === 0) return '0.9';
    if (depth === 1) return '0.7';
    if (depth === 2) return '0.5';
    return '0.3';
  }
}

export default new CrawlerService();

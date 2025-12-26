import { describe, it } from 'node:test';
import assert from 'node:assert';
import cacheService from '../services/cache.service.js';

describe('Cache Service', () => {
  it('should generate consistent cache keys', () => {
    const url = 'https://example.com';
    const options = { maxUrls: 100, crawlDepth: 3, concurrency: 5 };
    
    const key1 = cacheService.generateCacheKey(url, options);
    const key2 = cacheService.generateCacheKey(url, options);
    
    assert.strictEqual(key1, key2, 'Cache keys should be consistent');
    assert.strictEqual(key1, 'sitemap:https://example.com:100:3:5');
  });

  it('should generate different keys for different options', () => {
    const url = 'https://example.com';
    const options1 = { maxUrls: 100, crawlDepth: 3, concurrency: 5 };
    const options2 = { maxUrls: 200, crawlDepth: 3, concurrency: 5 };
    
    const key1 = cacheService.generateCacheKey(url, options1);
    const key2 = cacheService.generateCacheKey(url, options2);
    
    assert.notStrictEqual(key1, key2, 'Different options should produce different keys');
  });
});

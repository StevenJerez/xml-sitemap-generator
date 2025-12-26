import { describe, it } from 'node:test';
import assert from 'node:assert';
import sitemapService from '../services/sitemap.service.js';

describe('Sitemap Service', () => {
  it('should generate valid XML sitemap', () => {
    const urls = [
      {
        url: 'https://example.com/',
        lastmod: '2025-12-26T10:00:00.000Z',
        changefreq: 'daily',
        priority: '1.0',
      },
      {
        url: 'https://example.com/about',
        lastmod: '2025-12-26T10:00:00.000Z',
        changefreq: 'weekly',
        priority: '0.8',
      },
    ];

    const result = sitemapService.generateSitemaps(urls);

    assert.strictEqual(result.sitemaps.length, 1);
    assert.strictEqual(result.index, null);
    assert.ok(result.sitemaps[0].content.includes('<?xml version="1.0"'));
    assert.ok(result.sitemaps[0].content.includes('<urlset'));
    assert.ok(result.sitemaps[0].content.includes('https://example.com/'));
  });

  it('should create sitemap index for large URL sets', () => {
    // Create 60,000 test URLs
    const urls = Array.from({ length: 60000 }, (_, i) => ({
      url: `https://example.com/page-${i}`,
      lastmod: '2025-12-26T10:00:00.000Z',
      changefreq: 'weekly',
      priority: '0.5',
    }));

    const result = sitemapService.generateSitemaps(urls);

    assert.strictEqual(result.sitemaps.length, 2); // 50k + 10k
    assert.ok(result.index !== null);
    assert.ok(result.index.content.includes('<sitemapindex'));
    assert.ok(result.index.content.includes('sitemap-1.xml'));
    assert.ok(result.index.content.includes('sitemap-2.xml'));
  });

  it('should escape XML special characters', () => {
    const urls = [
      {
        url: 'https://example.com/page?a=1&b=2',
        lastmod: '2025-12-26T10:00:00.000Z',
        changefreq: 'daily',
        priority: '1.0',
      },
    ];

    const result = sitemapService.generateSitemaps(urls);
    const xml = result.sitemaps[0].content;

    assert.ok(xml.includes('&amp;'), 'Should escape & character');
    assert.ok(!xml.includes('&b='), 'Should not contain unescaped ampersand');
  });

  it('should chunk arrays correctly', () => {
    const array = Array.from({ length: 125 }, (_, i) => i);
    const chunks = sitemapService.chunkArray(array, 50);

    assert.strictEqual(chunks.length, 3);
    assert.strictEqual(chunks[0].length, 50);
    assert.strictEqual(chunks[1].length, 50);
    assert.strictEqual(chunks[2].length, 25);
  });
});

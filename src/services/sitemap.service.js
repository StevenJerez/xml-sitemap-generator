class SitemapService {
  constructor() {
    this.maxUrlsPerSitemap = 50000;
  }

  generateSitemaps(urls) {
    if (urls.length === 0) {
      return {
        sitemaps: [],
        index: null,
      };
    }

    // If URLs exceed limit, create multiple sitemaps
    if (urls.length > this.maxUrlsPerSitemap) {
      return this.generateSitemapIndex(urls);
    }

    // Single sitemap
    return {
      sitemaps: [
        {
          name: 'sitemap.xml',
          content: this.generateSitemapXML(urls),
        },
      ],
      index: null,
    };
  }

  generateSitemapIndex(urls) {
    const sitemaps = [];
    const chunks = this.chunkArray(urls, this.maxUrlsPerSitemap);

    chunks.forEach((chunk, index) => {
      sitemaps.push({
        name: `sitemap-${index + 1}.xml`,
        content: this.generateSitemapXML(chunk),
      });
    });

    // Generate sitemap index
    const baseUrl = urls[0]?.url ? new URL(urls[0].url).origin : '';
    const index = this.generateSitemapIndexXML(sitemaps, baseUrl);

    return {
      sitemaps,
      index: {
        name: 'sitemap-index.xml',
        content: index,
      },
    };
  }

  generateSitemapXML(urls) {
    const urlEntries = urls.map(url => {
      return `  <url>
    <loc>${this.escapeXml(url.url)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
  }

  generateSitemapIndexXML(sitemaps, baseUrl) {
    const sitemapEntries = sitemaps.map(sitemap => {
      return `  <sitemap>
    <loc>${this.escapeXml(`${baseUrl}/${sitemap.name}`)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default new SitemapService();

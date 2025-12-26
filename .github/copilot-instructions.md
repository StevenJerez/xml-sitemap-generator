# Copilot Instructions for XML Sitemap Generator

## Project Overview

This is a production-ready, self-hosted XML sitemap generator built with Node.js (ES modules), Express, WebSockets, and Redis. The application crawls websites and generates standards-compliant XML sitemaps with real-time progress updates.

## Architecture

### Core Components

1. **Backend Services** (`src/services/`):
   - `crawler.service.js`: Web crawler with depth control, concurrency, and robots.txt compliance
   - `sitemap.service.js`: XML sitemap generation with automatic index creation for >50k URLs
   - `cache.service.js`: Redis-based caching with TTL
   - `auth.service.js`: Authentication (Basic Auth + JWT)

2. **Server** (`src/server.js`):
   - Express HTTP server
   - WebSocket server for real-time progress
   - Global `wss` object for broadcasting
   - Graceful shutdown handlers

3. **Frontend** (`public/`):
   - Vanilla JavaScript SPA (no build system)
   - WebSocket client for live updates
   - Basic/JWT authentication support

### Key Patterns

**ES Modules**: All files use `import/export` syntax. No CommonJS.

**Service Singletons**: Services export singleton instances:
```javascript
export default new CrawlerService();
```

**WebSocket Broadcasting**: Services access global WebSocket server:
```javascript
global.wss?.clients.forEach((client) => {
  if (client.jobId === jobId && client.readyState === 1) {
    client.send(JSON.stringify(data));
  }
});
```

**Job Management**: Active jobs stored in-memory Map in `api.routes.js`. In production, consider Redis.

**Authentication Flow**:
- Basic Auth: Username/password in Authorization header
- JWT: Login endpoint issues token, subsequent requests use Bearer token
- Middleware checks `AUTH_TYPE` env var to determine method

### Data Flow

1. User submits URL → Frontend sends POST to `/api/generate`
2. Backend checks Redis cache (key: `sitemap:{url}:{maxUrls}:{depth}:{concurrency}`)
3. If not cached: Create job → Start crawler → Broadcast progress via WebSocket
4. Crawler: Fetch pages → Extract links → Respect robots.txt → Update progress
5. Generate sitemap(s) → Cache result → Notify completion
6. User downloads via `/api/download/:jobId`

## Development Conventions

### File Organization

- **Services**: Pure business logic, no Express dependencies
- **Routes**: Express route handlers, call services
- **Middleware**: Reusable Express middleware (auth, error handling)
- **Config**: Centralized configuration from environment variables

### Error Handling

Services throw errors, routes catch and return JSON:
```javascript
try {
  const result = await crawlerService.crawl(url, options);
} catch (error) {
  res.status(500).json({ error: error.message });
}
```

### Progress Callbacks

Crawler accepts callback for progress updates:
```javascript
await crawlerService.crawl(url, options, (progress) => {
  // Broadcast via WebSocket
  // progress.type: 'crawled', 'skipped', 'error'
});
```

### Sitemap Generation

- Single sitemap: <50k URLs
- Multiple sitemaps + index: ≥50k URLs
- Each sitemap chunk: max 50k URLs
- Format: XML with `loc`, `lastmod`, `changefreq`, `priority`

## Common Tasks

### Adding New API Endpoint

1. Add route in `src/routes/api.routes.js`
2. Use `authenticate` middleware for protected routes
3. Return JSON responses with consistent structure
4. Handle errors gracefully

### Modifying Crawler Behavior

- Edit `src/services/crawler.service.js`
- Key methods: `crawl()`, `processUrl()`, `extractLinks()`
- Respect robots.txt via `robots-parser` library
- Use axios for HTTP requests

### Updating Frontend

- Edit `public/app.js` (vanilla JS class)
- WebSocket messages handled in `handleWebSocketMessage()`
- Authentication stored in localStorage
- No build step required

### Cache Management

- Cache keys: `cacheService.generateCacheKey(url, options)`
- TTL: Configured via `CACHE_TTL` env var
- Clear cache: `cacheService.clear()`

## Environment Variables

Critical vars to set in production:
- `AUTH_USERNAME`, `AUTH_PASSWORD`: Change from defaults!
- `JWT_SECRET`: Random, secure string
- `REDIS_HOST`: Redis server hostname (use service name in Docker)
- `NODE_ENV`: Set to `production`

## Deployment Notes

### Docker/EasyPanel

- Dockerfile uses `node:20-alpine` for small image size
- Non-root user for security
- Health check endpoint: `/api/health`
- Port: 3000 (exposed and configurable via PORT env var)

### Redis Connection

- Service name as hostname in Docker Compose/EasyPanel
- Connection handled in `cache.service.js`
- Graceful degradation if Redis unavailable (logs warning, continues without cache)

### WebSocket in Production

- Use `wss://` for HTTPS deployments
- Ensure reverse proxy supports WebSocket upgrades
- EasyPanel handles this automatically

## Testing Workflow

1. Health check: `GET /api/health`
2. Auth test: Try endpoints with/without credentials
3. Small crawl: Test with `maxUrls: 10, crawlDepth: 1`
4. Cache test: Same request twice (second should be instant)
5. WebSocket: Connect and subscribe to job ID

## Known Limitations

- Jobs stored in-memory (lost on restart)
- No user management (single username/password)
- No rate limiting on API endpoints
- Large sitemaps kept in memory (consider streaming for very large sites)

## Code Style

- ES6+ features preferred
- Async/await over callbacks
- Descriptive variable names
- Comments for complex logic only
- No semicolons (but won't break if added)

## Dependencies

Key libraries:
- `express`: HTTP server
- `ws`: WebSocket server
- `axios`: HTTP client
- `cheerio`: HTML parsing
- `redis`: Redis client
- `robots-parser`: robots.txt parsing
- `jsonwebtoken`: JWT auth
- `bcrypt`: Password hashing (for future features)
- `uuid`: Job ID generation

## Future Improvements

When extending the project:
- Move job storage to Redis for persistence
- Add rate limiting middleware
- Implement user management
- Add scheduled crawls
- Stream large sitemaps instead of in-memory
- Add webhook notifications
- Implement API key authentication

# 🗺️ XML Sitemap Generator

A production-ready, self-hosted sitemap generator with real-time crawling progress, Redis caching, and authentication. Perfect for generating XML sitemaps for websites of any size.

## ✨ Features

- **Real-time Progress**: WebSocket-based live updates during crawling
- **Smart Crawling**: Configurable depth, concurrency, and URL limits
- **Sitemap Standards**: Full XML sitemap support with priority and changefreq
- **Large Sites**: Automatic sitemap index generation for >50,000 URLs
- **Redis Caching**: Intelligent caching to avoid redundant crawls
- **Authentication**: Built-in Basic Auth or JWT token authentication
- **robots.txt Compliance**: Respects robots.txt rules
- **Modern UI**: Clean, responsive single-page application
- **Docker Ready**: Easy deployment with Docker and Docker Compose
- **EasyPanel Compatible**: Optimized for EasyPanel deployment

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Web Interface](#web-interface)
  - [API Usage](#api-usage)
- [Deployment](#deployment)
  - [Docker](#docker)
  - [Docker Compose](#docker-compose)
  - [EasyPanel](#easypanel)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Architecture](#architecture)
- [License](#license)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd xml-sitemap-generator

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start services
docker-compose up -d

# Access the application
open http://localhost:3000
```

Default credentials: `admin` / `changeme` (change these in `.env`)

## 📦 Installation

### Prerequisites

- Node.js >= 18.0.0
- Redis >= 6.0
- npm or yarn

### Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start Redis (if not running)
redis-server

# Start development server
npm run dev

# Or production mode
npm start
```

## ⚙️ Configuration

Configuration is managed via environment variables. Create a `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CACHE_TTL=3600

# Authentication Configuration
AUTH_USERNAME=admin
AUTH_PASSWORD=changeme
AUTH_TYPE=basic  # 'basic' or 'jwt'
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Crawler Configuration
DEFAULT_MAX_URLS=10000
DEFAULT_CRAWL_DEPTH=3
DEFAULT_CONCURRENCY=5
REQUEST_TIMEOUT=10000
USER_AGENT=SitemapGenerator/1.0

# CORS Configuration
CORS_ORIGIN=*
```

### Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `REDIS_HOST` | Redis server hostname | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `CACHE_TTL` | Cache expiration in seconds | `3600` |
| `AUTH_TYPE` | Authentication method (`basic` or `jwt`) | `basic` |
| `AUTH_USERNAME` | Username for Basic Auth | `admin` |
| `AUTH_PASSWORD` | Password for Basic Auth | `changeme` |
| `DEFAULT_MAX_URLS` | Maximum URLs to crawl | `10000` |
| `DEFAULT_CRAWL_DEPTH` | Maximum crawl depth | `3` |
| `DEFAULT_CONCURRENCY` | Concurrent requests | `5` |

## 💻 Usage

### Web Interface

1. Navigate to `http://localhost:3000`
2. Log in with your credentials
3. Enter the website URL to crawl
4. Configure crawl options:
   - **Max URLs**: Maximum number of URLs to crawl
   - **Crawl Depth**: How deep to crawl from the starting URL
   - **Concurrency**: Number of simultaneous requests
5. Click "Generate Sitemap"
6. Watch real-time progress
7. Download generated sitemaps

### API Usage

#### Authentication

**Basic Auth:**
```bash
curl -u admin:changeme http://localhost:3000/api/health
```

**JWT Auth:**
```bash
# Get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changeme"}'

# Use token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/health
```

#### Generate Sitemap

```bash
curl -X POST http://localhost:3000/api/generate \
  -u admin:changeme \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxUrls": 1000,
    "crawlDepth": 3,
    "concurrency": 5
  }'
```

Response:
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "started",
  "message": "Crawling started. Connect via WebSocket for real-time updates."
}
```

#### Check Status

```bash
curl http://localhost:3000/api/status/JOB_ID \
  -u admin:changeme
```

#### Download Sitemap

```bash
# Download main sitemap or index
curl http://localhost:3000/api/download/JOB_ID \
  -u admin:changeme \
  -o sitemap.xml

# Download specific file
curl "http://localhost:3000/api/download/JOB_ID?file=sitemap-1.xml" \
  -u admin:changeme \
  -o sitemap-1.xml
```

#### List Available Sitemaps

```bash
curl http://localhost:3000/api/sitemaps/JOB_ID \
  -u admin:changeme
```

## 🐳 Deployment

### Docker

```bash
# Build image
docker build -t sitemap-generator .

# Run container
docker run -d \
  --name sitemap-generator \
  -p 3000:3000 \
  -e REDIS_HOST=your-redis-host \
  -e AUTH_USERNAME=admin \
  -e AUTH_PASSWORD=your-secure-password \
  sitemap-generator
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

### EasyPanel

#### Step 1: Prepare Your Repository

Ensure your repository contains:
- `Dockerfile`
- `.env.example`
- All source code

#### Step 2: Create Application in EasyPanel

1. Log in to your EasyPanel dashboard
2. Click "Create" → "Application"
3. Choose "Deploy from GitHub" or "Deploy from Git"
4. Select your repository

#### Step 3: Configure Application

**Build Settings:**
- **Build Type**: Dockerfile
- **Dockerfile Path**: `./Dockerfile`
- **Build Context**: `.`

**Container Settings:**
- **Port**: `3000`
- **Health Check Path**: `/api/health`

#### Step 4: Add Redis Service

1. In EasyPanel, click "Create" → "Service"
2. Select "Redis"
3. Configure:
   - **Name**: `redis`
   - **Version**: `7-alpine`
   - **Persistent Storage**: Enable (for data persistence)

#### Step 5: Configure Environment Variables

Add these environment variables in EasyPanel:

```
NODE_ENV=production
PORT=3000
REDIS_HOST=redis
REDIS_PORT=6379
CACHE_TTL=3600
AUTH_USERNAME=your-username
AUTH_PASSWORD=your-secure-password
AUTH_TYPE=basic
DEFAULT_MAX_URLS=10000
DEFAULT_CRAWL_DEPTH=3
DEFAULT_CONCURRENCY=5
```

**Important:** Change `AUTH_USERNAME` and `AUTH_PASSWORD` to secure values!

#### Step 6: Set Up Domain and SSL

1. Go to your application settings
2. Under "Domains", click "Add Domain"
3. Enter your domain (e.g., `sitemap.yourdomain.com`)
4. Enable "SSL Certificate" (Let's Encrypt)
5. Wait for SSL certificate provisioning

#### Step 7: Deploy

1. Click "Deploy" button
2. Wait for build to complete
3. Check deployment logs for any errors
4. Access your application at your configured domain

#### Networking in EasyPanel

EasyPanel automatically handles networking between services:
- Services can communicate using service names as hostnames
- Use `redis` as REDIS_HOST (service name)
- No need to configure additional networking

#### Updating the Application

```bash
# Push changes to git
git add .
git commit -m "Update application"
git push

# In EasyPanel, click "Redeploy"
```

#### Troubleshooting EasyPanel Deployment

**Check Logs:**
```bash
# In EasyPanel dashboard:
# 1. Go to your application
# 2. Click "Logs" tab
# 3. Check both build and runtime logs
```

**Common Issues:**

1. **Redis connection failed:**
   - Ensure Redis service is running
   - Check REDIS_HOST is set to `redis` (service name)
   - Verify both services are in the same project

2. **Authentication not working:**
   - Verify AUTH_USERNAME and AUTH_PASSWORD are set
   - Check environment variables in EasyPanel dashboard

3. **Port conflicts:**
   - Ensure PORT is set to 3000
   - EasyPanel handles external port mapping automatically

4. **SSL certificate issues:**
   - Wait a few minutes for Let's Encrypt provisioning
   - Ensure domain DNS is properly configured

## 📚 API Documentation

### Endpoints

#### `POST /api/auth/login`
Authenticate and get JWT token (only for JWT auth mode).

**Request:**
```json
{
  "username": "admin",
  "password": "changeme"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "24h"
}
```

#### `POST /api/generate`
Start sitemap generation.

**Headers:**
- `Authorization`: Basic auth or Bearer token

**Request:**
```json
{
  "url": "https://example.com",
  "maxUrls": 1000,
  "crawlDepth": 3,
  "concurrency": 5
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "status": "started",
  "message": "Crawling started..."
}
```

**Cached Response:**
```json
{
  "cached": true,
  "jobId": "uuid",
  "result": { ... },
  "urlCount": 500,
  "completedAt": "2025-12-26T10:30:00Z"
}
```

#### `GET /api/status/:jobId`
Get job status.

**Response:**
```json
{
  "jobId": "uuid",
  "status": "completed",
  "url": "https://example.com",
  "options": { ... },
  "startedAt": "2025-12-26T10:00:00Z",
  "completedAt": "2025-12-26T10:30:00Z",
  "urlCount": 500,
  "sitemapCount": 1,
  "hasIndex": false
}
```

#### `GET /api/download/:jobId[?file=filename]`
Download sitemap file.

**Query Parameters:**
- `file` (optional): Specific sitemap file to download

**Response:** XML file

#### `GET /api/sitemaps/:jobId`
List available sitemap files.

**Response:**
```json
{
  "jobId": "uuid",
  "files": [
    {
      "name": "sitemap.xml",
      "size": 12345
    }
  ]
}
```

#### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-26T10:00:00Z",
  "redis": true
}
```

### WebSocket API

Connect to `ws://localhost:3000/ws` (or `wss://` for HTTPS).

**Subscribe to Job:**
```json
{
  "type": "subscribe",
  "jobId": "uuid"
}
```

**Progress Events:**
```json
{
  "type": "progress",
  "jobId": "uuid",
  "data": {
    "type": "crawled",
    "url": "https://example.com/page",
    "depth": 1,
    "discovered": 100,
    "visited": 50,
    "total": 45
  }
}
```

**Completion Event:**
```json
{
  "type": "completed",
  "jobId": "uuid",
  "data": {
    "urlCount": 500,
    "sitemapCount": 1,
    "hasIndex": false
  }
}
```

**Error Event:**
```json
{
  "type": "error",
  "jobId": "uuid",
  "data": {
    "error": "Error message"
  }
}
```

## 🧪 Testing

### Test Plan

#### Unit Tests

Test individual services:
```bash
npm test
```

#### Integration Tests

Test complete workflows:

**1. Health Check:**
```bash
curl http://localhost:3000/api/health
```

**2. Authentication:**
```bash
# Basic Auth
curl -u admin:changeme http://localhost:3000/api/health

# JWT Auth
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changeme"}'
```

**3. Sitemap Generation:**
```bash
curl -X POST http://localhost:3000/api/generate \
  -u admin:changeme \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxUrls": 10,
    "crawlDepth": 1,
    "concurrency": 2
  }'
```

**4. Cache Testing:**
```bash
# First request (should crawl)
time curl -X POST http://localhost:3000/api/generate \
  -u admin:changeme \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","maxUrls":10,"crawlDepth":1}'

# Second request (should return cached)
time curl -X POST http://localhost:3000/api/generate \
  -u admin:changeme \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","maxUrls":10,"crawlDepth":1}'
```

### Expected Outputs

**Successful Crawl:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2025-12-26T10:30:00.000Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ...
</urlset>
```

**Sitemap Index (for >50,000 URLs):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-1.xml</loc>
    <lastmod>2025-12-26T10:30:00.000Z</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-2.xml</loc>
    <lastmod>2025-12-26T10:30:00.000Z</lastmod>
  </sitemap>
</sitemapindex>
```

## 🏗️ Architecture

### Project Structure

```
xml-sitemap-generator/
├── src/
│   ├── config/
│   │   └── index.js              # Configuration management
│   ├── middleware/
│   │   └── auth.middleware.js    # Authentication middleware
│   ├── routes/
│   │   └── api.routes.js         # API endpoints
│   ├── services/
│   │   ├── auth.service.js       # Authentication service
│   │   ├── cache.service.js      # Redis caching
│   │   ├── crawler.service.js    # Web crawler
│   │   └── sitemap.service.js    # Sitemap generation
│   └── server.js                 # Express server & WebSocket
├── public/
│   ├── index.html                # Frontend UI
│   ├── styles.css                # Styles
│   └── app.js                    # Frontend JavaScript
├── Dockerfile                    # Docker configuration
├── docker-compose.yml            # Docker Compose setup
├── package.json                  # Dependencies
├── .env.example                  # Environment variables template
└── README.md                     # This file
```

### Components

**Backend Services:**
- **Server**: Express.js HTTP server with WebSocket support
- **Crawler**: Intelligent web crawler with depth control
- **Sitemap Generator**: XML sitemap creation with index support
- **Cache**: Redis-based caching layer
- **Auth**: Authentication middleware (Basic/JWT)

**Frontend:**
- **Single-page application**: No build process required
- **WebSocket client**: Real-time progress updates
- **Responsive design**: Works on all devices

### Data Flow

1. User submits URL via UI
2. Frontend authenticates and sends POST to `/api/generate`
3. Backend checks Redis cache
4. If not cached, starts crawler with progress callbacks
5. Crawler fetches pages, extracts links, respects robots.txt
6. Progress updates broadcast via WebSocket
7. Sitemap generator creates XML files
8. Results cached in Redis
9. User downloads generated sitemaps

### Caching Strategy

Cache key format: `sitemap:{url}:{maxUrls}:{crawlDepth}:{concurrency}`

Example: `sitemap:https://example.com:10000:3:5`

Cache invalidation: TTL-based (default 1 hour)

## 🔒 Security Considerations

1. **Change default credentials** in production
2. **Use HTTPS** in production (handled by EasyPanel/reverse proxy)
3. **Set strong JWT_SECRET** for JWT auth
4. **Limit CORS_ORIGIN** in production
5. **Use environment variables** for sensitive data
6. **Regular updates** of dependencies

## 🔧 Troubleshooting

### Common Issues

**Redis connection failed:**
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

**Port already in use:**
```bash
# Change PORT in .env
PORT=3001
```

**WebSocket connection failed:**
- Check firewall settings
- Ensure WebSocket proxy is configured correctly
- Use `wss://` for HTTPS deployments

**Crawl errors:**
- Check robots.txt of target site
- Verify URL is accessible
- Check request timeout settings

## 📝 License

MIT License - feel free to use this project for any purpose.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review error logs

## 🎯 Roadmap

- [ ] User management system
- [ ] Sitemap scheduling
- [ ] Multi-language support
- [ ] Advanced filtering options
- [ ] Sitemap comparison tools
- [ ] Export to different formats
- [ ] API rate limiting
- [ ] Webhook notifications

---

**Built with ❤️ using Node.js, Express, Redis, and WebSockets**

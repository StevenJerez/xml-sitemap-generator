# EasyPanel Deployment Guide

## Prerequisites

- EasyPanel account with admin access
- Domain name (optional, but recommended)
- Git repository with the application code

## Step-by-Step Deployment

### 1. Prepare Redis Service

1. In EasyPanel dashboard, click **"Create"** → **"Service"**
2. Select **"Redis"**
3. Configure the service:
   - **Name**: `redis` (important - this will be used as hostname)
   - **Version**: `7-alpine`
   - **Memory Limit**: 256MB (adjust based on needs)
   - **Enable Persistent Storage**: ✓ (check this box)
   - **Volume Path**: `/data`

4. Click **"Create"**
5. Wait for Redis to start (should take 10-30 seconds)

### 2. Create Application

1. Click **"Create"** → **"Application"**
2. Choose deployment method:
   - **Option A**: Deploy from GitHub
     - Connect your GitHub account
     - Select the repository
     - Choose the branch (usually `main` or `master`)
   - **Option B**: Deploy from Docker Hub
     - Enter image name if you've pre-built the image

### 3. Configure Build Settings

1. **Build Method**: Dockerfile
2. **Dockerfile Path**: `./Dockerfile`
3. **Build Context**: `.` (root directory)
4. **Build Arguments**: (leave empty unless needed)

### 4. Configure Container Settings

1. **Container Port**: `3000`
2. **Health Check**:
   - **Path**: `/api/health`
   - **Interval**: 30 seconds
   - **Timeout**: 10 seconds
   - **Retries**: 3

3. **Resource Limits**:
   - **Memory**: 512MB (minimum), 1GB recommended
   - **CPU**: 0.5 cores minimum

### 5. Environment Variables

Click **"Add Environment Variable"** for each of the following:

#### Required Variables

```
NODE_ENV=production
PORT=3000
```

#### Redis Configuration

```
REDIS_HOST=redis
REDIS_PORT=6379
CACHE_TTL=3600
```

> **Note**: Use `redis` as the hostname - this is the service name from Step 1

#### Authentication (CHANGE THESE!)

```
AUTH_TYPE=basic
AUTH_USERNAME=your_secure_username
AUTH_PASSWORD=your_secure_password
```

> ⚠️ **Security Warning**: Change these to strong, unique values!

#### Optional: JWT Configuration

If using JWT authentication instead of Basic Auth:

```
AUTH_TYPE=jwt
JWT_SECRET=your_random_secret_key_min_32_chars
JWT_EXPIRES_IN=24h
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Crawler Configuration

```
DEFAULT_MAX_URLS=10000
DEFAULT_CRAWL_DEPTH=3
DEFAULT_CONCURRENCY=5
REQUEST_TIMEOUT=10000
USER_AGENT=SitemapGenerator/1.0
```

#### CORS Configuration

```
CORS_ORIGIN=*
```

> **Production Note**: Set this to your domain for better security:
> `CORS_ORIGIN=https://yourdomain.com`

### 6. Domain and SSL Setup

1. In the application settings, go to **"Domains"**
2. Click **"Add Domain"**
3. Enter your domain or subdomain:
   - Example: `sitemap.yourdomain.com`
4. **Enable SSL**: ✓ (Let's Encrypt automatic)
5. Click **"Add"**

#### DNS Configuration

Point your domain to EasyPanel:
- **Type**: A Record
- **Name**: `sitemap` (or whatever subdomain you chose)
- **Value**: Your EasyPanel server IP
- **TTL**: 300 (or your registrar's default)

Wait for DNS propagation (5-30 minutes).

### 7. Deploy

1. Review all settings
2. Click **"Deploy"** button
3. Monitor the build logs:
   - Build phase: 2-5 minutes
   - Container start: 10-30 seconds

### 8. Verify Deployment

#### Check Application Logs

1. Go to your application in EasyPanel
2. Click **"Logs"** tab
3. Look for:
   ```
   Cache service initialized
   Server running on port 3000
   Environment: production
   Auth type: basic
   WebSocket available at ws://localhost:3000/ws
   ```

#### Test Health Endpoint

```bash
curl https://yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-26T10:00:00.000Z",
  "redis": true
}
```

#### Test Authentication

```bash
curl -u your_username:your_password \
  https://yourdomain.com/api/health
```

#### Test in Browser

1. Open `https://yourdomain.com`
2. You should see the login page
3. Enter your credentials
4. Test generating a sitemap with a small site

## Networking Notes

### Service Communication

EasyPanel automatically configures networking:
- Services in the same project can communicate using service names
- Use `redis` as the hostname (not `localhost` or IP address)
- No manual network configuration needed

### WebSocket Support

EasyPanel automatically handles WebSocket upgrades:
- HTTP connections upgrade to WebSocket automatically
- Works with both `ws://` and `wss://` (SSL)
- No additional configuration needed

## Updating the Application

### Method 1: Auto-Deploy (Recommended)

1. Set up webhook in EasyPanel:
   - Go to application settings
   - Enable **"Auto Deploy"**
   - Copy the webhook URL
   - Add to GitHub repository webhooks

2. Push changes to GitHub:
   ```bash
   git add .
   git commit -m "Update application"
   git push origin main
   ```

3. EasyPanel automatically rebuilds and redeploys

### Method 2: Manual Deploy

1. Push changes to Git repository
2. Go to EasyPanel dashboard
3. Click **"Redeploy"** button
4. Wait for build to complete

## Monitoring and Maintenance

### View Logs

Real-time logs:
```
Application → Logs Tab → Runtime Logs
```

Build logs:
```
Application → Logs Tab → Build Logs
```

### Check Redis

```bash
# In EasyPanel shell for Redis service
redis-cli ping
# Should return: PONG

# Check memory usage
redis-cli INFO memory

# Check keys
redis-cli KEYS sitemap:*
```

### Resource Monitoring

EasyPanel shows:
- CPU usage
- Memory usage
- Network traffic
- Request count

Access via: Application → Metrics

## Troubleshooting

### Issue: Redis Connection Failed

**Symptoms**: Logs show "Redis Client Error"

**Solutions**:
1. Verify Redis service is running
2. Check `REDIS_HOST=redis` (use service name)
3. Ensure both services are in same project
4. Restart application container

### Issue: Build Failed

**Symptoms**: Build phase fails with errors

**Solutions**:
1. Check build logs for specific error
2. Verify Dockerfile syntax
3. Ensure all dependencies in package.json
4. Try rebuilding: `docker-compose build` locally first

### Issue: Application Won't Start

**Symptoms**: Container restarts repeatedly

**Solutions**:
1. Check runtime logs
2. Verify environment variables are set
3. Check PORT is 3000
4. Ensure Redis is accessible
5. Test locally with same environment

### Issue: WebSocket Connection Failed

**Symptoms**: Frontend shows connection errors

**Solutions**:
1. Verify domain has SSL (use `wss://` not `ws://`)
2. Check browser console for errors
3. Ensure WebSocket isn't blocked by firewall
4. Test: `wscat -c wss://yourdomain.com/ws`

### Issue: Authentication Not Working

**Symptoms**: 401 Unauthorized errors

**Solutions**:
1. Verify `AUTH_USERNAME` and `AUTH_PASSWORD` are set
2. Check credentials match in frontend and environment
3. For JWT: Verify `JWT_SECRET` is set and valid
4. Check `AUTH_TYPE` matches your configuration

### Issue: Slow Performance

**Solutions**:
1. Increase memory limit (Application Settings)
2. Adjust `DEFAULT_CONCURRENCY` (lower if causing issues)
3. Check Redis memory usage
4. Monitor CPU usage
5. Consider vertical scaling

## Scaling

### Vertical Scaling (Single Instance)

Increase resources:
- Memory: 1GB → 2GB
- CPU: 0.5 → 1.0 cores

Good for: Up to 10k URLs per crawl

### Horizontal Scaling (Multiple Instances)

For very high traffic:
1. Deploy multiple application instances
2. Use Redis for session sharing (already configured)
3. Add load balancer (EasyPanel supports this)
4. Consider separate Redis instance for production

## Backup and Recovery

### Backup Redis Data

EasyPanel automatically backs up persistent volumes.

Manual backup:
```bash
# In Redis shell
redis-cli SAVE
```

### Backup Environment Variables

1. Export from EasyPanel UI
2. Keep secure copy of `.env` file
3. Store in password manager

### Disaster Recovery

1. Keep git repository up to date
2. Document environment variables
3. Test restore procedure periodically
4. Keep Redis backups accessible

## Security Best Practices

1. **Use Strong Passwords**:
   ```bash
   # Generate secure password
   openssl rand -base64 32
   ```

2. **Regular Updates**:
   - Update dependencies: `npm update`
   - Rebuild image monthly
   - Monitor security advisories

3. **Environment Variables**:
   - Never commit `.env` to git
   - Use EasyPanel secrets management
   - Rotate passwords periodically

4. **SSL/TLS**:
   - Always use HTTPS in production
   - Let's Encrypt auto-renewal enabled
   - Force HTTPS redirect (EasyPanel handles this)

5. **Rate Limiting** (Future):
   - Consider adding rate limiting
   - Monitor for abuse
   - Set reasonable `DEFAULT_MAX_URLS`

## Cost Optimization

### Reduce Resource Usage

1. **Memory**:
   - Start with 512MB
   - Monitor usage
   - Scale up only if needed

2. **CPU**:
   - 0.5 cores sufficient for most use cases
   - Lower `DEFAULT_CONCURRENCY` if CPU-bound

3. **Redis**:
   - 256MB Redis adequate for caching
   - Adjust `CACHE_TTL` based on usage
   - Clear old cache: Lower TTL value

### Monitor Usage

Check monthly:
- Total requests
- Average response time
- Resource utilization
- Cache hit rate

## Support and Resources

- **EasyPanel Docs**: https://easypanel.io/docs
- **Project README**: See README.md
- **Issue Tracker**: GitHub Issues
- **Community**: EasyPanel Discord

## Quick Reference

### Common Commands

```bash
# Check health
curl https://yourdomain.com/api/health

# Generate sitemap
curl -X POST https://yourdomain.com/api/generate \
  -u username:password \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","maxUrls":100,"crawlDepth":2}'

# View logs
# (In EasyPanel UI: Application → Logs)

# Restart application
# (In EasyPanel UI: Application → Restart)
```

### Environment Variable Checklist

- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `REDIS_HOST=redis`
- [ ] `AUTH_USERNAME` (changed from default)
- [ ] `AUTH_PASSWORD` (changed from default)
- [ ] `JWT_SECRET` (if using JWT)
- [ ] Domain configured
- [ ] SSL enabled

---

**Ready to deploy?** Follow the steps above and you'll have your sitemap generator running in minutes!

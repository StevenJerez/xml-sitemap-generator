class SitemapApp {
    constructor() {
        this.authToken = localStorage.getItem('authToken') || '';
        this.authType = localStorage.getItem('authType') || 'basic';
        this.credentials = JSON.parse(localStorage.getItem('credentials') || '{}');
        this.ws = null;
        this.currentJobId = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuth();
    }

    bindEvents() {
        // Login
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        // Generate sitemap
        document.getElementById('generateForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleGenerate();
        });

        // Retry
        document.getElementById('retryBtn')?.addEventListener('click', () => {
            this.resetUI();
        });

        // New crawl
        document.getElementById('newCrawlBtn')?.addEventListener('click', () => {
            this.resetUI();
        });
    }

    checkAuth() {
        if (this.credentials.username && this.credentials.password) {
            this.showApp();
        } else if (this.authToken) {
            this.showApp();
        } else {
            this.showLogin();
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Store credentials for Basic Auth
        this.credentials = { username, password };
        localStorage.setItem('credentials', JSON.stringify(this.credentials));

        // Try JWT login first
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                this.authToken = data.token;
                this.authType = 'jwt';
                localStorage.setItem('authToken', this.authToken);
                localStorage.setItem('authType', 'jwt');
            } else {
                // Fall back to Basic Auth
                this.authType = 'basic';
                localStorage.setItem('authType', 'basic');
            }
        } catch (error) {
            // Use Basic Auth
            this.authType = 'basic';
            localStorage.setItem('authType', 'basic');
        }

        // Verify authentication
        const isValid = await this.verifyAuth();
        if (isValid) {
            this.showApp();
            document.getElementById('currentUser').textContent = username;
        } else {
            this.showError('loginError', 'Invalid credentials');
        }
    }

    async verifyAuth() {
        try {
            const response = await fetch('/api/health', {
                headers: this.getAuthHeaders(),
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    handleLogout() {
        localStorage.clear();
        this.authToken = '';
        this.credentials = {};
        this.showLogin();
    }

    showLogin() {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('appSection').style.display = 'none';
    }

    showApp() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('appSection').style.display = 'block';
        
        if (this.credentials.username) {
            document.getElementById('currentUser').textContent = this.credentials.username;
        }
    }

    getAuthHeaders() {
        if (this.authType === 'jwt' && this.authToken) {
            return {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json',
            };
        } else if (this.credentials.username && this.credentials.password) {
            const encoded = btoa(`${this.credentials.username}:${this.credentials.password}`);
            return {
                'Authorization': `Basic ${encoded}`,
                'Content-Type': 'application/json',
            };
        }
        return { 'Content-Type': 'application/json' };
    }

    async handleGenerate() {
        const url = document.getElementById('url').value;
        const maxUrls = parseInt(document.getElementById('maxUrls').value);
        const crawlDepth = parseInt(document.getElementById('crawlDepth').value);
        const concurrency = parseInt(document.getElementById('concurrency').value);

        const generateBtn = document.getElementById('generateBtn');
        generateBtn.disabled = true;
        generateBtn.textContent = 'Starting...';

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    url,
                    maxUrls,
                    crawlDepth,
                    concurrency,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to start crawl');
            }

            const data = await response.json();

            // If cached result
            if (data.cached) {
                this.showCachedResult(data);
                return;
            }

            // Start WebSocket connection
            this.currentJobId = data.jobId;
            this.connectWebSocket(data.jobId);
            this.showProgress();

        } catch (error) {
            this.showErrorSection(error.message);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Sitemap';
        }
    }

    connectWebSocket(jobId) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                jobId: jobId,
            }));
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'connected':
                this.addLog('Connected to server', 'info');
                break;

            case 'subscribed':
                this.addLog(`Subscribed to job ${data.jobId}`, 'info');
                break;

            case 'progress':
                this.updateProgress(data.data);
                break;

            case 'completed':
                this.handleCompletion(data.data);
                break;

            case 'error':
                this.showErrorSection(data.data.error);
                break;
        }
    }

    updateProgress(progress) {
        if (progress.type === 'crawled') {
            document.getElementById('discoveredCount').textContent = progress.discovered;
            document.getElementById('crawledCount').textContent = progress.visited;
            document.getElementById('currentDepth').textContent = progress.depth;

            const percentage = Math.min((progress.total / parseInt(document.getElementById('maxUrls').value)) * 100, 100);
            const progressFill = document.getElementById('progressFill');
            progressFill.style.width = `${percentage}%`;

            this.addLog(`✓ Crawled: ${progress.url}`, 'success');
        } else if (progress.type === 'skipped') {
            this.addLog(`⊘ Skipped: ${progress.url} (${progress.reason})`, 'info');
        } else if (progress.type === 'error') {
            this.addLog(`✗ Error: ${progress.url} - ${progress.error}`, 'error');
        }
    }

    async handleCompletion(data) {
        this.addLog('✓ Crawling completed!', 'success');
        
        setTimeout(async () => {
            await this.loadResults();
        }, 1000);
    }

    async loadResults() {
        try {
            const response = await fetch(`/api/sitemaps/${this.currentJobId}`, {
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error('Failed to load results');
            }

            const data = await response.json();
            this.showResults(data);
        } catch (error) {
            this.showErrorSection(error.message);
        }
    }

    showProgress() {
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('errorSection').style.display = 'none';
        
        document.getElementById('statusBadge').textContent = 'Running...';
        document.getElementById('statusBadge').className = 'status-badge running';

        // Reset counters
        document.getElementById('discoveredCount').textContent = '0';
        document.getElementById('crawledCount').textContent = '0';
        document.getElementById('currentDepth').textContent = '0';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('logContent').innerHTML = '';
    }

    showResults(data) {
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('errorSection').style.display = 'none';

        const totalUrls = document.getElementById('crawledCount').textContent;
        document.getElementById('totalUrls').textContent = totalUrls;
        document.getElementById('sitemapCount').textContent = data.files.length;
        document.getElementById('completedTime').textContent = new Date().toLocaleString();

        // Create download buttons
        const downloadSection = document.getElementById('downloadSection');
        downloadSection.innerHTML = '<h3>Download Sitemaps</h3>';

        data.files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'download-item';
            item.innerHTML = `
                <div>
                    <strong>${file.name}</strong>
                    ${file.isIndex ? '<span style="color: var(--primary-color);"> (Index)</span>' : ''}
                    <br>
                    <small>${(file.size / 1024).toFixed(2)} KB</small>
                </div>
                <button class="btn btn-primary btn-sm" onclick="app.downloadFile('${file.name}')">
                    Download
                </button>
            `;
            downloadSection.appendChild(item);
        });
    }

    showCachedResult(data) {
        this.currentJobId = data.jobId;
        this.showProgress();
        
        document.getElementById('statusBadge').textContent = 'Cached Result';
        document.getElementById('statusBadge').className = 'status-badge completed';
        
        this.addLog('✓ Using cached result', 'success');
        
        setTimeout(() => {
            this.loadResults();
        }, 500);
    }

    showErrorSection(message) {
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('errorSection').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;

        if (this.ws) {
            this.ws.close();
        }
    }

    async downloadFile(filename) {
        try {
            const url = `/api/download/${this.currentJobId}?file=${encodeURIComponent(filename)}`;
            const response = await fetch(url, {
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            alert('Failed to download file: ' + error.message);
        }
    }

    addLog(message, type = 'info') {
        const logContent = document.getElementById('logContent');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    showError(elementId, message) {
        const errorEl = document.getElementById(elementId);
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }

    resetUI() {
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('errorSection').style.display = 'none';
        
        if (this.ws) {
            this.ws.close();
        }
        
        this.currentJobId = null;
    }
}

// Initialize app
const app = new SitemapApp();

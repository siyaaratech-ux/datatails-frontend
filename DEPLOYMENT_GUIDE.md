# DataTails Deployment Guide

## Security Improvements Applied

### ✅ Fixed Security Issues
1. **Removed hardcoded API keys** - Now using environment variables
2. **Added rate limiting** - Prevents abuse and DoS attacks
3. **Input validation** - Validates all user inputs
4. **File upload security** - Size limits, type validation, sanitization
5. **CORS configuration** - Restricted to specific origins
6. **Error handling** - Secure error messages without sensitive data
7. **Logging** - Comprehensive security event logging

### 🔧 Environment Variables Setup

#### Backend (.env)
```bash
# Backend Environment Variables
GROQ_API_KEY=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
FLASK_ENV=development
SECRET_KEY=your-secret-key-change-this-in-production
CORS_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
MAX_FILE_SIZE=10485760
RATE_LIMIT_PER_MINUTE=10
RATE_LIMIT_PER_HOUR=100
```

#### Frontend (.env)
```bash
# Frontend Environment Variables
REACT_APP_API_URL=http://localhost:5000
REACT_APP_FIREBASE_API_KEY=AIzaSyDGT14SiCyZZeacCUMfvh10ZEVlipHn5PI
REACT_APP_FIREBASE_AUTH_DOMAIN=fyp-dt-1f493.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=fyp-dt-1f493
REACT_APP_FIREBASE_STORAGE_BUCKET=fyp-dt-1f493.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=134618746457
REACT_APP_FIREBASE_APP_ID=1:134618746457:web:908ab3c517cedad1d9eb48
REACT_APP_FIREBASE_MEASUREMENT_ID=G-5BP9YLL94W
```

## 🚀 Running the Application

### Development Mode

#### Backend
```bash
cd Backend
pip install -r requirements.txt
python app.py
```

#### Frontend
```bash
cd Frontend
npm install
npm start
```

### Production Mode

#### Using Docker
```bash
# Build and run with docker-compose
docker-compose up --build

# Or run individual services
docker build -t datatails-backend .
docker run -p 5000:5000 --env-file .env datatails-backend
```

#### Using Docker Compose
```bash
# Copy environment variables
cp .env.production .env

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔒 Security Features Added

### 1. Rate Limiting
- File uploads: 5 per minute
- Chat requests: 20 per minute
- Visualization requests: 30 per minute
- Global limits: 100 per hour, 10 per minute

### 2. Input Validation
- Query length: Max 1000 characters
- Response length: Max 5000 characters
- File size: Max 10MB
- File types: Only PDF, DOCX, TXT, CSV

### 3. Security Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000

### 4. Error Handling
- No sensitive data in error messages
- Comprehensive logging
- Graceful error responses

## 🌐 Deployment Options

### Option 1: Cloud Platforms (Recommended)
- **Backend**: Railway, Heroku, Render, DigitalOcean App Platform
- **Frontend**: Vercel, Netlify, GitHub Pages

### Option 2: VPS Deployment
- Use Nginx as reverse proxy
- SSL certificates with Let's Encrypt
- PM2 for process management

### Option 3: Container Orchestration
- Kubernetes
- Docker Swarm
- AWS ECS

## 📋 Pre-deployment Checklist

- [ ] Update all environment variables with production values
- [ ] Change default SECRET_KEY to a secure random value
- [ ] Configure CORS_ORIGINS with your actual domains
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Test all endpoints
- [ ] Verify file upload restrictions
- [ ] Check rate limiting functionality

## 🔍 Monitoring

### Health Checks
- Backend: `GET /` returns `{"status": "API is running"}`
- Frontend: Built-in React health checks

### Logs
- Application logs: Check console output
- Security logs: Monitor for suspicious activity
- Error logs: Track and resolve issues

## 📊 Resource Monitoring and Sizing

Use these to measure CPU and RAM so you can choose instance size and container limits for deployment.

### Container-level: `docker stats`

With the app running via Docker Compose:

```bash
# Live view (updates every few seconds)
docker stats

# Single snapshot
docker stats --no-stream
```

Shows per-container CPU % and memory usage. Use this to see backend and frontend usage under load.

### In-app metrics: `GET /api/metrics`

The backend exposes process and host resource metrics at **`GET /api/metrics`** (no auth by default; restrict in production if needed).

**Example:** `curl http://localhost:5000/api/metrics`

**Response shape:**
- **process**: `cpu_percent`, `memory_rss_mb`, `memory_vms_mb` (this process)
- **host**: `memory_total_mb`, `memory_available_mb`, `cpu_count_logical` (when available, e.g. on a single host)

### Recommended sizing workflow

1. Run typical workloads (chat, uploads, visualizations) for a few minutes.
2. Observe **`docker stats`** and **`GET /api/metrics`** during that period (or use the baseline script in `scripts/measure_resources.py` to log metrics to CSV).
3. Note peak CPU and RAM (backend is usually the heavier service).
4. Set your deployment instance size and Docker resource limits from that peak (e.g. 1.5–2× peak for headroom).

## 🛡️ Additional Security Recommendations

1. **Use HTTPS** in production
2. **Regular security updates** for dependencies
3. **Database security** if using external databases
4. **API key rotation** periodically
5. **Backup strategy** for important data
6. **Monitoring alerts** for unusual activity

## 📞 Support

For security issues or deployment problems, check the logs first and ensure all environment variables are properly configured.

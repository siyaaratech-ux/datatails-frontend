# DataTails Frontend - Deployment Guide

The **backend** is in a separate repo (`datatails-backend`). This guide covers the frontend repo and references the backend where needed.

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

#### Backend (in `datatails-backend` repo)
Set these in the backend repo’s `.env` or Vercel env:
```bash
GROQ_API_KEY=...
SECRET_KEY=...
CORS_ORIGINS=http://localhost:3000,https://datatail.online,https://www.datatail.online
MAX_FILE_SIZE=10485760
RATE_LIMIT_PER_MINUTE=10
RATE_LIMIT_PER_HOUR=100
```

#### Frontend (this repo: `Frontend/.env` or Vercel)
```bash
REACT_APP_API_URL=https://datatails-backend.vercel.app
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
REACT_APP_FIREBASE_MEASUREMENT_ID=...
```

## 🚀 Running the Application

### Development Mode

#### Backend (in `datatails-backend` repo)
```bash
cd path/to/datatails-backend
pip install -r requirements.txt
python app.py
```

#### Frontend (this repo)
```bash
cd Frontend
npm install
npm start
```

### Production Mode

#### Frontend with Docker (this repo only)
```bash
# Set REACT_APP_API_URL and Firebase vars in .env, then:
docker-compose up --build
```
Serves the frontend at http://localhost:3000. Backend runs separately (e.g. datatails-backend repo or https://datatails-backend.vercel.app).

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
- **Backend** (datatails-backend repo): Vercel (Flask), Railway, Render, etc.
- **Frontend** (this repo): Vercel, Netlify; set Root Directory to `Frontend` and `REACT_APP_API_URL` to backend URL.

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
- Backend (datatails-backend): `GET <backend-url>/` returns `{"status": "API is running"}`
- Frontend: Built-in React health checks

### Logs
- Application logs: Check console output
- Security logs: Monitor for suspicious activity
- Error logs: Track and resolve issues

## 📊 Resource Monitoring and Sizing

Use these to measure CPU and RAM so you can choose instance size and container limits for deployment.

### Container-level: `docker stats`

With the frontend running via this repo’s Docker Compose:

```bash
docker stats --no-stream
```

Shows frontend container CPU/memory. Backend (if run via its own repo) is monitored separately.

### Backend metrics: `GET /api/metrics`

The **backend** (datatails-backend) exposes process and host resource metrics at **`GET /api/metrics`**.

**Example:** `curl https://datatails-backend.vercel.app/api/metrics` (or your backend URL)

**Response shape:** `process` (cpu_percent, memory_rss_mb, …), `host` (when available).

### Recommended sizing workflow

1. Run typical workloads; observe backend metrics and container stats.
2. Set deployment instance size and limits from peak usage (e.g. 1.5–2× for headroom).

## 🛡️ Additional Security Recommendations

1. **Use HTTPS** in production
2. **Regular security updates** for dependencies
3. **Database security** if using external databases
4. **API key rotation** periodically
5. **Backup strategy** for important data
6. **Monitoring alerts** for unusual activity

## 📞 Support

For security issues or deployment problems, check the logs first and ensure all environment variables are properly configured.

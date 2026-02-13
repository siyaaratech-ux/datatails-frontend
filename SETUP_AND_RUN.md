# DataTails - Setup & Run Guide

## Prerequisites

- **Python 3.10+** (recommended; Python 3.9 may have dependency conflicts)
- **Node.js 18+** and npm
- **GROQ API key** (free at [console.groq.com](https://console.groq.com/))

---

## Quick Start (Development)

### 1. Get your GROQ API key

1. Go to [https://console.groq.com/](https://console.groq.com/)
2. Sign up for a free account
3. Create an API key
4. Copy the key (starts with `gsk_`)

### 2. Configure environment

Edit the `.env` file in the project root and set your GROQ API key:

```
GROQ_API_KEY=gsk_your_actual_key_here
```

### 3. Start the Backend

Open a terminal:

```powershell
cd D:\CODE\docs\startup\NewUpdatedDT\Backend
pip install -r requirements-minimal.txt
python app.py
```

The backend will run at **http://localhost:5000**

> **Note:** The minimal requirements allow basic endpoints (health, upload, subreddits). For **chat** and **visualization** features, install the full requirements (requires Python 3.10+ and takes ~10–15 minutes):
> ```powershell
> pip install -r requirements.txt
> ```

### 4. Start the Frontend

Open a **second** terminal:

```powershell
cd D:\CODE\docs\startup\NewUpdatedDT\Frontend
npm install
npm start
```

The frontend will open at **http://localhost:3000**

---

## Verify Everything Works

1. **Backend health check:** Visit [http://localhost:5000](http://localhost:5000) — you should see `{"status":"API is running"}`
2. **Frontend:** Visit [http://localhost:3000](http://localhost:3000) — the DataTails app should load
3. **Chat/Visualization:** Requires full `requirements.txt` installation (spaCy, sentence-transformers, etc.)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `GROQ_API_KEY not set` | Add your key to `.env` in the project root |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` (or `requirements-minimal.txt`) |
| CORS errors | Ensure `CORS_ORIGINS` in `.env` includes `http://localhost:3000` |
| Port already in use | Change port in `app.py` (backend) or `package.json` (frontend) |
| Python 3.9 version conflicts | Use Python 3.10+ or stick to `requirements-minimal.txt` |

---

## Production (Docker)

```powershell
# Set environment variables first (or use .env file)
docker-compose up --build
```

- Backend: http://localhost:5000
- Frontend: http://localhost:3000

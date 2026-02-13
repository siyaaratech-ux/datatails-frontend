# DataTails Frontend - Setup & Run Guide

The **backend** lives in a separate repo (`datatails-backend`). For local development you can run it locally or use the deployed API.

## Prerequisites

- **Node.js 18+** and npm
- (Optional) **Python 3.10+** and **GROQ API key** if running the backend locally from `datatails-backend` repo

---

## Quick Start (Development)

### 1. Configure environment

Copy `Frontend/.env.example` to `Frontend/.env` and set at least:

- `REACT_APP_API_URL` — backend API base URL:
  - Local: `http://localhost:5000` (run backend from `datatails-backend` repo)
  - Production: `https://datatails-backend.vercel.app`
- Add Firebase vars if you use auth (see `.env.example`).

### 2. Start the Backend (optional, for local API)

In the **datatails-backend** repo (separate project):

```powershell
cd path/to/datatails-backend
pip install -r requirements-minimal.txt
python app.py
```

The backend will run at **http://localhost:5000**

> For **chat** and **visualization** features, use full requirements: `pip install -r requirements.txt` (Python 3.10+).

### 3. Start the Frontend

In **this** repo (datatails-frontend):

```powershell
cd Frontend
npm install
npm start
```

The frontend will open at **http://localhost:3000**

---

## Verify Everything Works

1. **Backend** (if running locally): [http://localhost:5000](http://localhost:5000) — `{"status":"API is running"}`
2. **Frontend:** [http://localhost:3000](http://localhost:3000) — DataTails app loads
3. Set `REACT_APP_API_URL` to your backend URL; CORS must allow your frontend origin (e.g. `http://localhost:3000` in backend `CORS_ORIGINS`).

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | In `datatails-backend`, set `CORS_ORIGINS` to include `http://localhost:3000` (or your frontend origin) |
| Port already in use | Change port in frontend `package.json` or backend `app.py` |
| API not responding | Ensure backend is running or `REACT_APP_API_URL` points to deployed backend |

---

## Production (Docker)

This repo’s Docker setup is **frontend-only**. The backend runs in the `datatails-backend` repo or at https://datatails-backend.vercel.app.

```powershell
# From this repo root; set REACT_APP_API_URL (and Firebase vars) in .env
docker-compose up --build
```

- Frontend: http://localhost:3000 (served by nginx in the container)

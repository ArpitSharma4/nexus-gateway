---
description: How to run the Nexus Gateway backend and frontend
---

# Running the Nexus Gateway App

You need TWO terminals — one for the backend, one for the frontend.

---

## Terminal 1: Backend (FastAPI)

// turbo-all

1. Activate the virtual environment and start uvicorn:

```
c:\nexus-gateway\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Working directory: `c:\nexus-gateway`

This starts the API server at `http://localhost:8000`.
You can verify it's running by visiting `http://localhost:8000/docs` in a browser.

---

## Terminal 2: Frontend (Vite + React)

1. Install dependencies (only needed once or after package.json changes):

```
npm install
```

2. Start the dev server:

```
npm run dev
```

Working directory: `c:\nexus-gateway\frontend`

This starts the frontend at `http://localhost:5173`.
The Vite config proxies all `/api/*` requests to `http://localhost:8000`.

---

## Important Notes

- Always start the backend FIRST, then the frontend.
- The `.env` file in `c:\nexus-gateway` must have a valid `DATABASE_URL` pointing to your Supabase PostgreSQL instance.
- If the database tables don't exist yet, run `c:\nexus-gateway\venv\Scripts\python.exe init_db.py` from `c:\nexus-gateway` before starting the backend.

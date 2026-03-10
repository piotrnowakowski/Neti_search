# Neti Search

Monorepo layout:

```text
backend/   FastAPI + Python services + tests
frontend/  Next.js + React + shadcn/ui
data/      Local snapshots
```

## Local Run

Backend:

```bash
cd backend
source ../.venv/bin/activate
python -m uvicorn neti_search.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

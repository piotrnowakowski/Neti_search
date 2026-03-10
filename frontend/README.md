# Frontend

Local Next.js frontend for Neti Search.

## Stack

- Next.js App Router
- React 19
- Tailwind CSS v4
- `shadcn/ui` components

## Run

```bash
npm install
npm run dev
```

The frontend expects the FastAPI backend at `http://127.0.0.1:8000` by default.

To override it:

```bash
NETI_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

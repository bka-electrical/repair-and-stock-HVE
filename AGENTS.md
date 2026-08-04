# AGENTS.md

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (includes API middleware) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |

## Development Notes

- Frontend runs at `http://localhost:5173` (Vite dev server)
- API endpoints are served via `/dev-api/*` in development and `/api/*` in production
- API functions are in `api/*.js` (handlers) and `api/_lib/*.js` (shared helpers)
- Environment variables: copy `.env.example` to `.env` and fill in values

## Environment Variables

### Required (set before first run)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Optional

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
WHATSAPP_PHONE=6281259385874
WHATSAPP_API_KEY=
ALLOWED_ORIGINS=http://localhost:5173,https://your-app.vercel.app
```

## Vercel Deployment

1. Set all environment variables in Vercel dashboard (Settings → Environment Variables)
2. `vercel.json` configures build command, output directory, and rewrites
3. API routes (`/api/*`) are handled by Vite-built serverless functions

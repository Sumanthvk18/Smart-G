# Smart Garbage – Hongasandra Ward (Pilot)

Residents scan a QR code on the garbage vehicle, register their household once, and submit a waste handover (waste type, photo, GPS). The ward officer sees the submissions on a dashboard.

Demo build. It is not an official BBMP application.

```
backend/    FastAPI + PostgreSQL (Render + Neon)
frontend/   React + Vite (Netlify)
qr/         script that makes the vehicle QR code
```

| URL | Who |
|---|---|
| `/s/V1` | Resident: opened by the QR code on vehicle `KA 01 AB 1234` |
| `/officer` | Officer dashboard |

## Run locally

Needs Python 3.12, Node 20+, and a Postgres database (a free Neon database works).

```bash
# backend
cd backend
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # then fill in DATABASE_URL etc.
python app.py                     # http://localhost:8000/docs

# frontend (second terminal)
cd frontend
npm install
npm run dev                       # http://localhost:5173/s/V1
```

Tables and the demo vehicle are created automatically when the backend starts.

Database changes go in `backend/migrations/` as new numbered files (`002_add_x.sql`, …). Never edit a file that has already run. `python migrate.py` applies pending files, and the backend also applies them on startup.

## Deploy

### 1. Neon (database)
1. Create a project at neon.tech.
2. Copy the connection string (`postgresql://...?sslmode=require`).

### 2. Render (backend)
1. New → Web Service → connect this repo.
2. Settings:
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Instance type: Free
3. Environment variables:
   - `DATABASE_URL`: the Neon connection string
   - `JWT_SECRET`: click "Generate"
   - `OFFICER_EMAIL`: officer login email
   - `OFFICER_PASSWORD`: officer login password
4. Deploy, then open `https://<service>.onrender.com/api/health` and check it returns `"status": "success"`.
5. Settings → Auto-Deploy: **Off**. GitHub Actions triggers deploys (see "Auto-deploy" below).

### 3. Netlify (frontend)
1. Edit `frontend/public/_redirects`: replace `YOUR-RENDER-SERVICE` with the Render service name, then commit.
2. Build once locally (`cd frontend && npm run build`), then in Netlify: Add new project → Deploy manually → drop the `frontend/dist` folder. Don't import the repo: Netlify would then build every push itself, and pushes would cost credits twice.
3. Open `https://<site>.netlify.app/s/V1` on a phone.

Netlify forwards `/api/*` to Render, so the browser treats the backend as the same site. The officer login cookie therefore works on iPhones too, and no CORS setup is needed.

### Auto-deploy (GitHub Actions)

`.github/workflows/deploy.yml` runs on every push to `main` and deploys only what changed:

| Changed | What runs |
|---|---|
| `backend/migrations/**` | migrations on Neon, before anything else deploys |
| other `backend/**` | import check, then Render deploy hook |
| `frontend/**` | build in Actions, then upload to Netlify |

If a migration fails, nothing deploys. Pushes that only change docs or `qr/` don't start the workflow. To deploy everything, open the Actions tab and choose Deploy → Run workflow.

Repo secrets (Settings → Secrets and variables → Actions):

| Secret | Where to find it |
|---|---|
| `DATABASE_URL` | Neon connection string (same as on Render) |
| `RENDER_DEPLOY_HOOK_URL` | Render service → Settings → Deploy Hook |
| `NETLIFY_AUTH_TOKEN` | Netlify → User settings → Applications → Personal access tokens |
| `NETLIFY_SITE_ID` | Netlify project → Project configuration → Project ID |

Free-plan limits to watch:

- **Netlify** (tightest): 300 credits a month. Each production deploy costs 15, so about 20 frontend deploys a month. Bandwidth and requests also use credits, and the `/api` proxy counts too, including photos. When credits run out, the site pauses until next month. Group frontend changes into fewer pushes, or add `[skip ci]` to a commit message to skip deploying it. Usage: Netlify → Team → Usage & billing.
- **Render**: 500 build minutes a month. Each deploy takes a few minutes.
- **GitHub Actions**: free for this public repo.
- **Neon**: a migration run wakes the database for a few seconds.

### 4. QR code
```bash
pip install "qrcode[pil]"
python qr/make_qr.py https://<site>.netlify.app/s/V1
```
Print `qr/vehicle-V1.png` and stick it on the vehicle.

More vehicles: in the officer dashboard, open **Vehicles & QR**, add the vehicle number, then print or download its QR code. Codes run V2, V3, …

## Before the demo

- Render's free plan sleeps after 15 minutes without traffic. Open the site about 2 minutes before presenting; the app shows "Connecting to server…" while it wakes.
- GPS only works over HTTPS (Netlify provides this). The resident must tap "Allow". If they don't, the submission still goes through and is marked "No GPS".
- Every scan starts with the meter number. A registered meter fills in the household details automatically; a new one opens the registration form. The phone pre-fills the last meter number it used.

## Notes

- Photos are resized on the phone (max 1280 px, JPEG) and stored in Postgres (`submissions.photo`). That is fine for a demo; use object storage (S3/R2) for real use.
- There is no OTP for residents yet. Anyone with the QR link can register or submit.
- "Today" on the dashboard uses India time (Asia/Kolkata).

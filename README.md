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

### 3. Netlify (frontend)
1. Edit `frontend/public/_redirects`: replace `YOUR-RENDER-SERVICE` with the Render service name, then commit.
2. Add new site → import this repo. `netlify.toml` already sets the base folder, build command and publish folder.
3. Open `https://<site>.netlify.app/s/V1` on a phone.

Netlify forwards `/api/*` to Render, so the browser treats the backend as the same site. The officer login cookie therefore works on iPhones too, and no CORS setup is needed.

### 4. QR code
```bash
pip install "qrcode[pil]"
python qr/make_qr.py https://<site>.netlify.app/s/V1
```
Print `qr/vehicle-V1.png` and stick it on the vehicle.

## Before the demo

- Render's free plan sleeps after 15 minutes without traffic. Open the site about 2 minutes before presenting; the app shows "Connecting to server…" while it wakes.
- GPS only works over HTTPS (Netlify provides this). The resident must tap "Allow". If they don't, the submission still goes through and is marked "No GPS".
- Every scan starts with the meter number. A registered meter fills in the household details automatically; a new one opens the registration form. The phone pre-fills the last meter number it used.

## Notes

- Photos are resized on the phone (max 1280 px, JPEG) and stored in Postgres (`submissions.photo`). That is fine for a demo; use object storage (S3/R2) for real use.
- There is no OTP for residents yet. Anyone with the QR link can register or submit.
- "Today" on the dashboard uses India time (Asia/Kolkata).

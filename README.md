# SmartPay Frontend

> Portfolio simulation only. This React app talks to the SmartPay demo backend. It never handles
> real money, cards, CVVs, bank credentials or KYC data. Every balance and transaction shown here is
> simulated.

The frontend is a React/Vite single-page app with role-aware customer and ADMIN screens. It uses
the Spring Boot backend at `http://localhost:8081` through a Vite dev proxy.

For the full project picture, start with the [root README](../README.md).

---

## Quick facts

| Item | Value |
|---|---|
| Framework | React 18, Vite 6 |
| Routing | React Router 6 |
| Styling | Bootstrap 5 plus custom `styles.css` |
| Charts | Recharts |
| HTTP client | Axios |
| Tests | Vitest + React Testing Library |
| Dev port | `3001` (strict) |
| API proxy | `/api` → `http://localhost:8081` |
| Build output | `dist/` |

---

## What the app includes

### Customer screens

- Centred login and registration screens
- Simulated wallet dashboard with:
  - Balance KPI cards
  - Quick demo top-up with amount chips
  - Cashflow and status charts
  - Filterable recent activity
- Send money screen with:
  - Transfer / payment type cards
  - Quick amount chips
  - Optional device and location risk signals
  - Result card with status and risk badges
- Transaction history with:
  - Status chips
  - Type filter
  - Search
  - Pagination
- Transaction detail with:
  - Deterministic explanation
  - AI wording shown separately
  - Risk score meter and rule hits

### ADMIN screens

- Dark control-centre dashboard with KPI cards and four interactive charts
- Review queue with search/status filters
- Fraud alert queue with sender/receiver identity and badges
- Fraud rule list and management controls

The UI only hides or shows screens by role. The backend is still the authority for authorization.

---

## Source layout

```text
src/
├── api/client.js          Axios instance, token interceptor, response unwrap helper
├── components/            Layout, feedback, badges and shared UI pieces
├── context/AuthContext.jsx Authentication state and login/register/logout actions
├── pages/                  Login, register, dashboard, send, history, detail, admin pages
├── utils/format.js         Money/date formatting and idempotency key helper
├── styles.css              Global theme, customer theme, dark admin theme, login screen
├── App.jsx                 Route table and role guards
├── main.jsx                React entry point
└── test/                   Vitest setup and tests
```

---

## Prerequisites

- Node 20+
- npm
- The backend running at `http://localhost:8081`

Host builds use the D-drive npm cache configured in `../.npmrc`.

---

## Install and run

From `smartpay-frontend`:

```powershell
npm install
npm run dev
```

Open:

```text
http://localhost:3001
```

The dev server uses `strictPort: true`, so port `3001` must be free. If it is busy, stop the other
app or change the port in `vite.config.js`.

### Point to a different backend

By default `/api` is proxied to `http://localhost:8081`. Override it like this:

```powershell
$env:VITE_API_BASE_URL = 'http://localhost:8081'
npm run dev
```

Only the origin is used, so a trailing `/api/v1` is not needed.

---

## Demo login

Register a customer from `/register`, or use the local demo admin when the backend seeding flag is
enabled:

```text
Email:    admin
Password: admin123
```

The login page deliberately does not show this hint. Login still works normally.

There is no public ADMIN registration screen. The backend assigns roles.

---

## Scripts

```powershell
npm run dev       # Start Vite dev server on port 3001
npm run build     # Create production bundle in dist/
npm run preview   # Serve the production bundle on port 3001
npm test          # Run Vitest once
```

### Tests

```powershell
npm test
```

The current suite covers money/date formatting and protected-route redirects. React Router prints
future-flag warnings during tests; these are informational and do not fail the suite.

### Production build

```powershell
npm run build
```

The build succeeds and creates hashed CSS/JS chunks. Charts are in a separate `charts` chunk.

In the full Compose stack, Nginx serves `dist/` and proxies `/api` to the backend. See
[`../docker/nginx.conf`](../docker/nginx.conf) and the [root README](../README.md#quick-start--full-stack-recommended).

---

## API response contract used by the UI

All API responses use this wrapper:

```json
{
  "success": true,
  "message": "Simulated transfer created. No real money is involved.",
  "data": {},
  "simulated": true
}
```

`client.js` unwraps `response.data.data`, so pages work with the inner object.

Money arrives as decimal strings such as `"1500.00"`. `formatMoney()` displays them as
`1,500.00 INR`. Do not parse money into JavaScript floating point for calculations; the backend is
the financial authority.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Login shows network error | Start the backend at `http://localhost:8081` |
| CORS error | Add `http://localhost:3001` to backend `APP_CORS_ALLOWED_ORIGINS` |
| Port 3001 already in use | Stop the other process or change Vite `server.port` |
| Charts do not appear | Confirm Recharts is installed with `npm install` |
| Empty history after login | Add simulated money or create a transfer from the dashboard |
| ADMIN pages show 403 | Log in with an ADMIN account; roles are enforced by the backend |

---

## More documentation

- [Root README](../README.md)
- [Backend README](../smartpay-backend/README.md)
- [API list](../docs/API_LIST.md)
- [Architecture](../docs/ARCHITECTURE.md)
- [Phase plan](../docs/PHASE_PLAN.md)

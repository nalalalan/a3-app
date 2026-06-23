# a3.aolabs.io

Persistent MINI Cooper ownership cockpit for desire, price anchors, and private telemetry.

## Current build

- Railway-ready Node app.
- Persistent JSON storage through `A3_DATA_DIR`.
- Chase CSV imports are stored server-side.
- Advisor runs and chat are remembered.
- OpenAI advisor uses `OPENAI_API_KEY` and `OPENAI_MODEL` when configured.
- Private access can be enabled with `A3_ACCESS_CODE` before importing real bank data.
- Plaid Link can connect Chase without storing Chase credentials in the app.
- Plaid Transactions syncs purchases; account totals use cached Plaid account snapshots by default so routine refreshes do not call the paid real-time Balance endpoint.

## Local preview

```powershell
npm install
npm run check
npm start
```

Open `http://localhost:3000`.

## Deploy

Railway should serve the Node app with `a3.aolabs.io` as the custom domain.

Recommended Railway variables:

- `A3_DATA_DIR=/data`
- `A3_ACCESS_CODE=<private app code>`
- `OPENAI_API_KEY=<rotated key>`
- `OPENAI_MODEL=gpt-5-mini`
- `A3_MONITOR_INTERVAL_MS=86400000` for daily bank syncs
- `A3_PLAID_SYNC_MIN_INTERVAL_MS=86400000` so startup, interval, and manual sync paths reuse the stored bank snapshot until one day has passed
- `PLAID_CLIENT_ID=<Plaid client id>`
- `PLAID_SECRET=<Plaid secret>`
- `PLAID_ENV=production` for Chase
- `PLAID_PRODUCTION_REVIEW_PENDING=true` while Plaid production access is under review
- `PLAID_REALTIME_BALANCE=false` unless a rare deliberate real-time balance check is worth Plaid Balance per-request billing
- `A3_TOKEN_SECRET=<long random secret for stored Plaid tokens>`
- `PLAID_REDIRECT_URI=https://a3.aolabs.io/oauth.html`
- attach a persistent volume mounted at `/data`

Add `https://a3.aolabs.io/oauth.html` to the allowed redirect URIs in the Plaid dashboard. Do not put bank usernames or passwords in Railway, git, chat, or this app. Chase login happens only inside Plaid Link / Chase authorization.

## Plaid cost guard

Routine A3 refreshes must stay on `/transactions/sync` plus `/accounts/get`, and the Plaid sync gate must stay at one scan per day unless Alan explicitly changes the cadence. Do not use `/accounts/balance/get` for the normal car-goal motivation/readiness surface; Plaid bills successful Balance calls per request, and A3 only needs current-enough bank snapshots for the daily morning-email/MINI motivation loop.

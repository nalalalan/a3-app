# a3.aolabs.io

Persistent A3 financial readiness monitor for Chase CSV exports.

## Current build

- Railway-ready Node app.
- Persistent JSON storage through `A3_DATA_DIR`.
- Chase CSV imports are stored server-side.
- Advisor runs and chat are remembered.
- OpenAI advisor uses `OPENAI_API_KEY` and `OPENAI_MODEL` when configured.
- Private access can be enabled with `A3_ACCESS_CODE` before importing real bank data.
- Plaid Link can connect Chase without storing Chase credentials in the app.
- Synced Plaid balances and transactions are stored server-side and folded into the A3 readiness state.

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
- `OPENAI_MODEL=gpt-5.5`
- `PLAID_CLIENT_ID=<Plaid client id>`
- `PLAID_SECRET=<Plaid secret>`
- `PLAID_ENV=production` for Chase
- `PLAID_PRODUCTION_REVIEW_PENDING=true` while Plaid production access is under review
- `A3_TOKEN_SECRET=<long random secret for stored Plaid tokens>`
- `PLAID_REDIRECT_URI=https://a3.aolabs.io/oauth.html`
- attach a persistent volume mounted at `/data`

Add `https://a3.aolabs.io/oauth.html` to the allowed redirect URIs in the Plaid dashboard. Do not put bank usernames or passwords in Railway, git, chat, or this app. Chase login happens only inside Plaid Link / Chase authorization.

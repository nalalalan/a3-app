# a3.aolabs.io

Persistent A3 financial readiness monitor for Chase CSV exports.

## Current build

- Railway-ready Node app.
- Persistent JSON storage through `A3_DATA_DIR`.
- Chase CSV imports are stored server-side.
- Advisor runs and chat are remembered.
- OpenAI advisor uses `OPENAI_API_KEY` and `OPENAI_MODEL` when configured.
- Private access can be enabled with `A3_ACCESS_CODE` before importing real bank data.
- Plaid/Chase OAuth is not wired yet.

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
- attach a persistent volume mounted at `/data`

# chase.aolabs.io

Local-only personal finance radar for Chase CSV exports.

## Current build

- Static app.
- No backend.
- No Plaid token handling yet.
- CSV parsing and analysis run in the browser.
- Imported transactions are saved only in browser `localStorage`.

## Local preview

```powershell
npm install
npm run check
npm start
```

Open `http://localhost:3000`.

## Deploy

The publishable surface is `public/` and uses `public/CNAME` for `chase.aolabs.io`.

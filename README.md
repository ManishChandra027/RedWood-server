# RareWolf deployment and local runbook

## Environment

Copy `.env.example` to `.env` for local development, then replace every placeholder. Keep `.env` out of source control. The server validates MongoDB, token secrets, origins, mail, Cloudinary, ports and proxy settings before opening its listener. Access and refresh token secrets must be different random values of at least 32 characters.

`CORS_ORIGIN` accepts a comma-separated list of exact frontend origins, with no trailing paths. `CLIENT_URL` is the public frontend URL. `TRUST_PROXY_HOPS` should match the exact number of trusted reverse-proxy hops; leave it unset when connecting directly. The API uses HTTP-only, SameSite=Lax cookies, so deploy the frontend and API on the same site and preferably proxy `/api` through the frontend origin.

The app requires a MongoDB database. It creates indexes from Mongoose models and creates the shared `authRateLimitBuckets` indexes on the first rate-limited request. The catalogue sample data is imported with `npm run seed:catalog` after confirming `MONGO_URL` targets the intended database.

## Commands

From `server`:

- `npm install`
- `npm test`
- `npm run dev` for local watch mode
- `npm start` for production startup
- `npm run seed:catalog` to import the sample catalogue

From `client`:

- `npm install`
- `npm run lint`
- `npm run build`

Publish `client/dist` with SPA history fallback enabled. Route `/api/*` to the server, or set `VITE_API_BASE_URL` to the API base URL at build time. The API's CORS allowlist must include the exact browser origin if the API is hosted separately. If frontend and API use different sites, review cookie `SameSite`/`Secure` policy before deployment; the current cookie policy is designed for same-site deployments.

## Logging

The API writes one JSON request-completion line with request ID, method, path (without query string), response code and duration. Server errors use the same request ID. Request bodies, headers, cookies, emails, passwords, tokens, OTPs and exception messages are excluded from logs. Match an error response's `requestId` to the server output when investigating failures.

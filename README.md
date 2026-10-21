# RareWolf deployment and local runbook

## Environment

Copy `.env.example` to `.env` for local development, then replace every placeholder. Keep `.env` out of source control. The server validates MongoDB, token secrets, origins, mail, Cloudinary, ports and proxy settings before opening its listener. Access and refresh token secrets must be different random values of at least 32 characters.

`CORS_ORIGIN` accepts a comma-separated list of exact frontend origins, with no trailing paths. `CLIENT_URL` is the public frontend URL. `TRUST_PROXY_HOPS` should match the exact number of trusted reverse-proxy hops; leave it unset when connecting directly. The API uses HTTP-only, SameSite=Lax cookies, so deploy the frontend and API on the same site and preferably proxy `/api` through the frontend origin.

The app requires a MongoDB database. It creates indexes from Mongoose models and creates the shared `authRateLimitBuckets` indexes on the first rate-limited request. The catalogue sample data is imported with `npm run seed:catalog` after confirming `MONGO_URL` targets the intended database.

`server/.env.example` lists every required API setting: `MONGO_URL`, distinct `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`, both token expiry values, `CORS_ORIGIN`, `CLIENT_URL`, SMTP host/port/security/user/password/from address, and Cloudinary cloud name/key/secret. `PORT` defaults to `8000`; `TRUST_PROXY_HOPS` is optional and must match the number of trusted proxies. Production token secrets must be different random strings of at least 32 characters. The application selects the `rarewolfDB` database name in code, so use a dedicated throwaway MongoDB deployment for destructive/integration checks rather than pointing tests or provisioning at production.

## Commands

From `server`:

- `npm install`
- `npm test`
- `npm run dev` for local watch mode
- `npm start` for production startup
- `npm run seed:catalog` to import the sample catalogue
- `npm run promote:admin -- <verified-account-email> --confirm` to promote one existing, email-verified account after checking that `.env` points to the intended database. This operator-only script is not an API endpoint; it never accepts credentials or prints tokens.
- `npm run promote:admin -- <verified-account-email> --confirm` to promote an existing verified customer to `admin`.

From `client`:

- `npm install`
- `npm run lint`
- `npm run build`

Publish `client/dist` with SPA history fallback enabled. Route `/api/*` to the server, or set `VITE_API_BASE_URL` to the API base URL at build time. The API's CORS allowlist must include the exact browser origin if the API is hosted separately. If frontend and API use different sites, review cookie `SameSite`/`Secure` policy before deployment; the current cookie policy is designed for same-site deployments.

## Admin setup and release checks

1. Deploy the API with validated production environment settings and confirm `GET /api/v1/health` returns HTTP 200 after MongoDB connects.
2. Create an account through the normal signup flow and complete email verification.
3. Check that the server `.env` points to the intended replica-set database, then run `npm run promote:admin -- <verified-account-email> --confirm` from `server`. This command refuses an unknown or unverified account and prints no credentials or tokens. The command only promotes verified accounts to `admin`.
4. Sign in as an admin and open `/admin`. Confirm ordinary customers are forbidden from admin APIs.
5. Before launch, replace all sample catalogue descriptions, prices/specifications and placeholder imagery in `src/data/catalog.json` with approved product content; import only after confirming the target database. Verify product images are approved and uploaded through the admin UI/Cloudinary.
6. Run `npm test` in `server`, then `npm run lint` and `npm run build` in `client`. Exercise browse, cart, checkout, order history, stock changes and cancellation using a disposable database and test accounts before release.

V1 admin orders use COD and keep payment status read-only. Promotions, paid/revenue analytics, exports, audit-log UI, multiple admin roles, warehouses and payment gateway support are deferred. The admin dashboard intentionally omits revenue totals until payment verification exists.

## Logging

The API writes one JSON request-completion line with request ID, method, path (without query string), response code and duration. Server errors use the same request ID. Request bodies, headers, cookies, emails, passwords, tokens, OTPs and exception messages are excluded from logs. Match an error response's `requestId` to the server output when investigating failures.

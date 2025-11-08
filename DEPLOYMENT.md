Deployment checklist — Render (production)

This file documents the minimum steps and verifications to run the pizza platform in production (Render or similar host).

1) Environment variables (Render: set these in Service -> Environment -> "Environment Variables")

  Required (server/backend):
  - MONGO_URI (or MONGODB_URI)
  - JWT_SECRET
  - RESEND_API_KEY (if email needed)
  - RESEND_FROM
  - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
  - MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_ENV, MPESA_CALLBACK_URL (if using MPESA)
  - SELLER_EMAIL, SELLER_PASSWORD (optional)
  - NODE_ENV=production
  - PORT (optional; Render sets a port automatically)

  Required (frontend):
  - NEXT_PUBLIC_API_URL (set to your backend base URL, e.g. https://api.yourdomain.com)

2) Cookie / CORS configuration

  - Backend must set Set-Cookie with Secure and SameSite=None for cross-site logins. (Already implemented in `backend/controllers/authController.js` — sets `sameSite: 'none'` when NODE_ENV=production and `secure: true`).
  - Backend must enable CORS with credentials: true and return the correct origin. The app currently uses `cors({ origin: true, credentials: true })` which echoes the request origin — this is acceptable for many setups, but you may prefer a whitelist for stricter security.
  - Frontend fetch calls must use `credentials: 'include'` when calling the backend. This is already used across the frontend.

3) HTTPS and domains

  - Ensure both frontend and backend are served over HTTPS. Browsers require Secure cookies for SameSite=None.
  - If using a custom domain, ensure DNS and TLS are configured and that `NEXT_PUBLIC_API_URL` points at the HTTPS backend URL.

4) Render-specific tips

  - Set `NODE_ENV=production` on your backend service.
  - Add backend env vars to the *Service* settings for the backend deployment.
  - For the frontend on Render, set `NEXT_PUBLIC_API_URL` to the backend's HTTPS URL and redeploy so the value is baked into the client bundle.
  - If using Render's static site + separate backend, confirm the browser network requests go to the expected backend URL (check DevTools Network -> request URL).

5) Debugging checklist when auth fails in production

  - Check Network tab for the login POST request and confirm the server responds with a 200 and JSON containing `user`.
  - Confirm the response includes a `Set-Cookie` header. If not present, the backend did not set the cookie (inspect server logs, ensure cookie-setting code ran).
  - If `Set-Cookie` header exists, confirm the cookie has `SameSite=None; Secure` attributes and domain/path match your needs.
  - If `Set-Cookie` exists but browser does not store the cookie, ensure the request was made over HTTPS and that `credentials: 'include'` was used.
  - If the server responds with success but later `GET /api/auth/me` returns 401, check `JWT_SECRET` consistency between sign and verify — if different or missing, JWT verification will fail.
  - Confirm `MONGO_URI` and other required env vars are set and that the backend started successfully (check backend logs on Render).

6) Why you might sometimes see "Logged in" without backend present

  - The frontend can show "Logged in" only when it receives a response with `data.user` from the backend. If you see that message while the backend is down, possible explanations:
    - A cached response or service-worker (unlikely unless you added one).
    - The frontend was talking to a different backend (e.g., in your build `NEXT_PUBLIC_API_URL` was `http://localhost:5000`) and the environment used at deploy time differed from runtime.
    - A previous session cookie already existed in the browser and `fetch('/api/auth/me')` returned a user before you attempted the login flow. That makes the UI appear logged-in even if the subsequent login POST failed.
    - In dev fallback behavior, the server may return developer-friendly payloads (e.g., temporary passwords or verification codes) when `RESEND_API_KEY` is missing — these are only returned when `NODE_ENV !== 'production'`.

7) Quick verification commands (run locally or in production console)

  - Check backend health endpoint (replace URL):

```powershell
curl https://your-backend.example.com/api/health
```

  - From browser DevTools: inspect the login POST -> confirm response JSON and `Set-Cookie` header; confirm cookie attributes.

8) Optional improvements

  - Use a stricter CORS origin whitelist instead of `origin: true`.
  - Add an env validator at server startup to fail fast if required env vars (JWT_SECRET, MONGO_URI) are missing.
  - Consider using a persistent session store (Redis) if you need server-side session revocation across instances.

---
If you'd like, I can commit an env-validator to the backend, add an explicit CORS whitelist pattern for your Render domain(s), and add a small script that checks that `Set-Cookie` is present in login responses. Tell me which of those you'd like me to implement next.

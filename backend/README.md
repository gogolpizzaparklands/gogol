# GoGol Pizza Backend

Setup:

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies: `npm install`.
3. Run dev: `npm run dev` (requires nodemon).

Endpoints:
- `POST /api/auth/register` — register
- `POST /api/auth/login` — login
- `GET /api/products` — list products
- `POST /api/orders` — create order (authenticated)
- `POST /api/orders/:id/stkpush` — init payment (authenticated)
- `POST /api/orders/mpesa/callback` — mpesa callback
 - `POST /api/auth/logout` — logout (clears httpOnly cookie)

Notes on product deletion:
- Deleting a product will also attempt to remove its images from Cloudinary (if public_id is present).
- Only the product owner (seller) or admin can delete/update the product.

Notes:
- Add Cloudinary and Mpesa credentials to `.env`.

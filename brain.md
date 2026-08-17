# Cherie E-commerce — Project Brain

## Architecture
- `frontend/`: React + Vite single-page shop and protected admin area.
- `backend/`: Express REST API with MongoDB Atlas/Mongoose, JWT auth, Multer image upload, and PDFKit invoices.
- The visual language is Cherie: blush pink (`#f35f9b`), warm white, elegant serif headings.
- Frontend is split into `components/`, `components/admin/`, `context/`, and `pages/`; `App.jsx` lazy-loads each route so Admin and checkout code are not downloaded on the initial shop view.
- Storefront styling is a premium feminine jewellery boutique: deep berry announcement bar, wide blush/pink editorial hero with responsive outer margins and generous internal padding, subtle gold accents, gift/service strip, elevated product cards, and a polished checkout/admin surface. On phones, carousel images use their full natural aspect ratio and the text moves below the image so no product image is cropped.

## Main flows
1. Store (`/`) fetches `GET /api/products` and shows a jewellery grid.
2. Product view (`/products/:id`) fetches one product and adds it to a browser cart.
3. Checkout (`/checkout`) lets customers increase, decrease, or remove bag items before posting customer/cart details to `POST /api/orders`; it then downloads `/api/orders/:id/invoice` as a PDF.
4. Admin signs in at `/admin/login` with the fixed administrator account and a password only; the password field has an eye toggle to show or hide its value. JWT is stored in localStorage and enables product upload/edit/delete, carousel image upload/edit/delete, order-status updates, and the persisted homepage collection-message controls.
5. The storefront hero collection message (`CHERIE COLLECTION`, heading, and description) is stored in MongoDB. Admin can edit each text field or hide/show only the text overlay while keeping the carousel images visible.

## Setup
- Backend: copy `backend/.env.example` to `backend/.env`, configure private `MONGODB_URI`, `JWT_SECRET`, and admin credentials, then `npm install` and `npm run dev`.
- Frontend: copy `frontend/.env.example` to `frontend/.env`, then `npm install` and `npm run dev`.
- Frontend uses Vite 8 with `@vitejs/plugin-react` 6; it requires Node.js 22.12–26, declared in the frontend package's `engines` setting for Render.
- Initial admin is created automatically from the env credentials when the backend starts.
- MongoDB connection details remain only in `backend/.env`; product, order, and carousel records persist in Atlas.
- `https://cherie-fonrtend.onrender.com` is the deployed backend API. Production frontend builds use it through `frontend/.env.production`; local development uses `localhost:5000`. The backend allows configured CORS origins, local Vite origins, and Render origins by default (`ALLOW_RENDER_ORIGINS=false` disables the last option).
- `backend/.env` is ignored by Git, so Render must receive a valid Mongo connection variable (`MONGODB_URI`; `MONGO_URI`, `MONGO_URL`, `MONGODB_URL`, and `MONGODB_CONNECTION_STRING` are accepted aliases), `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in its own Environment settings. Database routes return a safe 503 JSON response while Atlas is unavailable instead of crashing the service.
- A valid-password login that returns a 5xx while `/api/health` says MongoDB is connected means the deployed backend is missing `JWT_SECRET`; add that server-side Render environment variable and redeploy. No secret is exposed by the health diagnostic.

## API
- Public: `GET /api/health` (UptimeRobot-ready; returns `status`, `provider`, configured `GROQ_MODELS`, and safe Mongo/auth diagnostics: `database`, `databaseConfigured`, `databaseConfigSource`, `databaseIssue`, `authenticationConfigured`), `GET /api/products`, `GET /api/products/:id`, `GET /api/carousel`, `GET /api/collection-hero`, `POST /api/orders`, `GET /api/orders/:id/invoice`.
- Admin: `POST /api/auth/login`, products CRUD, carousel CRUD, `PATCH /api/collection-hero`, `POST /api/upload`, `GET /api/orders`, `PATCH /api/orders/:id/status`.

## Logo
- `frontend/public/logo.png` is the round pink Cherie logo used in both customer and admin headers.

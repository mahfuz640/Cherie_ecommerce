# Cherie E-commerce — Project Brain

## Architecture
- `frontend/`: React + Vite single-page shop and protected admin area.
- `backend/`: Express REST API with MongoDB Atlas/Mongoose, JWT auth, Multer image upload, and PDFKit invoices.
- The visual language is Cherie: blush pink (`#f35f9b`), warm white, elegant serif headings.
- Frontend is split into `components/`, `components/admin/`, `context/`, and `pages/`; `App.jsx` lazy-loads each route so Admin and checkout code are not downloaded on the initial shop view.
- Storefront styling is a premium feminine jewellery boutique: deep berry announcement bar, wide blush/pink editorial hero with responsive outer margins and generous internal padding, subtle gold accents, gift/service strip, elevated product cards, and a polished checkout/admin surface.

## Main flows
1. Store (`/`) fetches `GET /api/products` and shows a jewellery grid.
2. Product view (`/products/:id`) fetches one product and adds it to a browser cart.
3. Checkout (`/checkout`) lets customers increase, decrease, or remove bag items before posting customer/cart details to `POST /api/orders`; it then downloads `/api/orders/:id/invoice` as a PDF.
4. Admin signs in at `/admin/login`; JWT is stored in localStorage and enables product upload/edit/delete, carousel image upload/edit/delete, and order-status updates.

## Setup
- Backend: copy `backend/.env.example` to `backend/.env`, configure private `MONGODB_URI`, `JWT_SECRET`, and admin credentials, then `npm install` and `npm run dev`.
- Frontend: copy `frontend/.env.example` to `frontend/.env`, then `npm install` and `npm run dev`.
- Initial admin is created automatically from the env credentials when the backend starts.
- MongoDB connection details remain only in `backend/.env`; product, order, and carousel records persist in Atlas.

## API
- Public: `GET /api/health` (UptimeRobot-ready; returns `status`, `provider`, and configured `GROQ_MODELS`), `GET /api/products`, `GET /api/products/:id`, `GET /api/carousel`, `POST /api/orders`, `GET /api/orders/:id/invoice`.
- Admin: `POST /api/auth/login`, products CRUD, carousel CRUD, `POST /api/upload`, `GET /api/orders`, `PATCH /api/orders/:id/status`.

## Logo
- `frontend/public/logo.png` is the round pink Cherie logo used in both customer and admin headers.

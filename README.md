# GreenLoop

**A farm-to-table marketplace where every product carries its own proof of quality, origin, and how it was grown.**

GreenLoop connects **farmers, retailers, distributors and customers** on one platform. Farmers list produce with a photo; an AI model assesses it *server-side, at listing time*; and customers see the result — plus who grew it, how it was sourced, and a full order timeline — before and after they buy.

- **Live app:** https://green-loop-zeta.vercel.app
- **API:** https://greenloop-ise7.onrender.com
- **Author:** [Aditya Anjne](https://github.com/AdityaAnjne)

> The backend runs on a free hosting tier and sleeps when idle. The first request after a quiet period can take a minute while it wakes up.

---

## Why this project exists

Buying fresh produce online has three trust problems: you can't judge freshness from a listing, you don't know who actually grew it, and you can't tell whether what you're buying is genuinely fresh or pulled from a warehouse shelf. GreenLoop addresses all three:

1. **Quality is assessed server-side, at the moment a product is listed**, on the farmer's actual photo — not after purchase, and not trusting a number the client could fabricate.
2. **Every product shows the farmer's name**, on the marketplace, the detail panel, and the public QR-linked page.
3. **Every product declares how it's sourced** — picked fresh for this specific order, or drawn from stock already on hand — and the app behaves differently for each.

---

## Features

### Farmer
- Add, edit and delete products with a photo, soil type, pesticide info and price
- Choose a **product type** per listing:
  - **Fresh Harvest** — picked specifically for the order; no fixed stock count, no harvest date (see *Product types* below)
  - **Stored Stock** — the conventional model: a real quantity on hand and a real harvest date, shown to the customer
- Real GPS location captured from the browser when a product is listed (stored as null if permission is denied)
- **Server-side AI quality gate:** the uploaded photo is analysed by Google Gemini on the backend, not the browser. A product is **not listed at all** if the AI call fails or judges it unfit for sale — and the result can't be forged by a direct API call, since the client never supplies it
- Assign each product to a retailer
- Downloadable **QR code** per product that links to its public detail page

### Customer
- Marketplace showing the **farmer's name** on every product, plus AI-derived **freshness %** and a **star rating derived from that freshness**, so the two always agree
- **View Details** panel: farmer name, health benefit, description and shelf life (AI-generated per product at listing time, with a static fallback for older listings)
- Cart with a per-item quantity stepper — default 1 kg, **maximum 10 kg per item** (enforced in the UI *and* on the server)
- Checkout with a delivery address (remembered as the default for next time, still editable per order) and payment-method selector
- **My Orders** auto-refreshes every 15 seconds while open
- **Track this order** timeline with farm origin and timestamps
- **Cancel** an order while its items are still `PLACED` or `CONFIRMED` — scoped per item, so one retailer's slice being packed doesn't block cancelling another retailer's still-untouched item in the same order
- Wishlist (in-session only — see limitations)

### Retailer
- Sees **only their own items** in any order, even in a multi-retailer checkout
- Sees the delivery address to help pick a distributor whose area covers it
- Confirms their items and chooses a distributor

### Distributor
- Sees **only the items assigned to them**
- Packs, ships and delivers; sees the delivery address

### Admin
- Separate admin role with its own dashboard
- Views users without ever having password hashes sent to the browser

### Platform
- JWT authentication with role-based access control, enforced at the Spring Security layer (not just hidden in the UI)
- Dark / light theme
- Product images stored on Cloudinary

---

## Product types: Fresh Harvest vs. Stored Stock

This is GreenLoop's core differentiator from a conventional quick-commerce app. Every product declares one of two types, and the app behaves differently for each:

| | **Fresh Harvest** | **Stored Stock** |
|---|---|---|
| Meaning | Picked specifically once ordered | Already harvested, sitting in inventory |
| Quantity | Not collected, not stored, not shown — effectively unlimited | Required; decremented on order, restored on cancel |
| Harvest date | Not collected, not stored, not shown (hasn't happened yet) | Required; shown to the customer |
| Stock check at checkout | Skipped entirely | Enforced — rejects if insufficient |

A single order can mix both kinds. Part of the catalog can behave like a conventional warehouse-backed quick-commerce app (good for grains, pulses — things that don't lose quality sitting on a shelf), while another part behaves like a genuine farm-to-order model (good for produce where freshness really matters) — all on one platform, visible to the customer as a clear badge on every product.

**Suggested next step, not yet built:** tie this into the existing order timeline — a Fresh Harvest item's first event could read *"Received — being harvested for you"* instead of a generic "Order placed," making the distinction visible in real time, not just as a static badge.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Create React App), React Router, Axios, Tailwind CSS + custom CSS, lucide-react, qrcode.react |
| Backend | Java 21, Spring Boot 3.5, Spring MVC, Spring Security, Spring Data JPA / Hibernate 6 |
| Auth | JWT (jjwt 0.11.5), BCrypt password hashing |
| Database | MySQL 8.4 (Aiven in production) |
| AI | Google Gemini API (vision + structured JSON output), called server-side only |
| Media | Cloudinary |
| Build / deploy | Maven wrapper, Docker (multi-stage), Render (API), Vercel (frontend) |

---

## Architecture & key design decisions

### 1. Fulfilment state lives on the order **item**, not the order
A single checkout can contain products from several retailers. Tracking status and distributor on the whole `Order` meant any retailer with one item in it could confirm *every* retailer's items and choose a distributor for goods that weren't theirs.

`OrderItem` owns `status` and `distributorId`. Each retailer's slice moves through the lifecycle independently, and `Order.recomputeStatus()` derives the customer-facing status as the *slowest active item's stage*. Cancellation is scoped the same way — cancelling an order only touches the items still `PLACED`/`CONFIRMED`, leaving items another retailer has already progressed untouched rather than rejecting the whole request.

### 2. API responses are scoped to the caller
Retailers, distributors and farmers receive only their own items, subtotal and status — never another party's. Customers and admins see the full order. Access checks return "not found" rather than "forbidden" so order existence isn't leaked. Admin's user-listing endpoint returns a DTO that never includes password hashes, even bcrypt-hashed ones, in the API response.

### 3. The AI quality gate is enforced server-side, not trusted from the client
An earlier design had the browser call Gemini directly and submit the result as ordinary form fields — meaning a direct API call could submit a fabricated `qualityScore` with no real check ever happening. The backend now receives the raw image, calls Gemini itself, and is the sole authority on the result. A listing is refused outright if the AI call fails or judges the product unfit for sale; the client has no way to influence or bypass that outcome.

### 4. QR code → public product page
Each product's QR code opens `/product/{id}`, which shows origin, the farmer's name, product type and quality details without logging in. Printed on packaging, it acts as proof of provenance for the delivered box.

### 5. Append-only order history
`order_item_status_events` records one row per status transition, so the timeline is real history rather than just the current status.

### 6. Schema validated, not auto-altered
`spring.jpa.hibernate.ddl-auto=validate` — the app refuses to boot if entities and schema drift apart, instead of silently altering a production database. All schema changes are applied by hand, in order, and documented.

---

## Order lifecycle

```
PLACED ──► CONFIRMED ──► PACKED ──► SHIPPED ──► DELIVERED
  │            │
  └────────────┴──► CANCELLED   (customer, only before PACKED, scoped per item)
```

| Transition | Done by | Scope |
|---|---|---|
| PLACED → CONFIRMED | Retailer (picks a distributor) | Only that retailer's items |
| CONFIRMED → PACKED → SHIPPED → DELIVERED | Distributor | Only items assigned to them |
| → CANCELLED | Customer / admin | Only items still `PLACED` or `CONFIRMED` |

---

## Project structure

```
GreenLoop/
├── src/                        # React frontend
│   ├── pages/                  # Dashboards and pages (customer, retailer, distributor, farmer, admin)
│   │   └── farmer-dashboard/   # Products list, add product, edit product
│   ├── components/             # Shared UI (navbar, etc.)
│   ├── api/axiosInstance.js    # Axios instance + auth interceptor
│   ├── context/                # Theme context
│   └── styles/                 # CSS
├── public/
├── backend/                    # Spring Boot API
│   ├── src/main/java/com/greenloop/
│   │   ├── controller/         # REST controllers (Spring MVC)
│   │   ├── service/            # Business logic (orders, products, Gemini)
│   │   ├── repository/         # Spring Data JPA repositories
│   │   ├── model/              # JPA entities and enums
│   │   ├── dto/                # Response DTOs (e.g. PublicUserDto — never exposes password hashes)
│   │   ├── security/           # SecurityConfig, JwtAuthFilter, JwtUtil
│   │   └── config/             # Configuration and dev-only seeder
│   ├── src/main/resources/application.properties
│   ├── docs/database-migration-history.sql
│   ├── Dockerfile
│   └── pom.xml
├── .env.example
├── SECURITY.md
└── package.json
```

---

## Getting started

### Prerequisites
- Node.js 18+ and npm
- JDK 21
- MySQL 8

### 1. Database
```sql
CREATE DATABASE greenloop_auth;
```
The backend validates the schema on startup. Apply the schema described in `backend/docs/database-migration-history.sql` (a documented, ordered record of every schema change, including the reasoning behind each) to a fresh database before first run.

### 2. Backend configuration

`backend/src/main/resources/application.properties` reads everything from environment variables, with local-development fallbacks:

| Variable | Purpose | Local default |
|---|---|---|
| `DB_URL` | JDBC connection URL | `jdbc:mysql://localhost:3306/greenloop_auth?...` |
| `DB_USERNAME` | Database user | `root` |
| `DB_PASSWORD` | Database password | *(placeholder — set your own)* |
| `JWT_SECRET` | JWT signing secret, 32+ characters | *(placeholder — **always** set in production)* |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |
| `GEMINI_API_KEY` | Google Gemini API key | *(none)* |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Image storage | *(none)* |
| `PORT` | Server port | `8080` |

The Gemini model is set with the `gemini.model` property. **Model names change and older ones are retired** — check Google AI Studio or Google's current model list for a name that's actually available before deploying; a deprecated model name fails with a clear `404` naming its replacement.

Never commit real secrets — `.env` is git-ignored; use `.env.example` as a template.

### 3. Run the backend
```bash
cd backend
./mvnw spring-boot:run          # macOS / Linux
.\mvnw.cmd spring-boot:run      # Windows
```
API available at `http://localhost:8080`.

Optional demo data (dev only, never production):
```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=seed
```

### 4. Run the frontend
```bash
# from the repository root
npm install
npm start
```
App available at `http://localhost:3000`. Point it at your API with:
```
REACT_APP_API_BASE_URL=http://localhost:8080
```
(defaults to `http://localhost:8080` if unset).

---

## Deployment

| Part | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Set `REACT_APP_API_BASE_URL` to the API's public URL |
| API | Render (Docker) | Uses `backend/Dockerfile`; set all backend env vars in the service's Environment tab |
| Database | Aiven MySQL | SSL required; use the service URI as `DB_URL` |

**Deployment order matters:** apply any schema change to the production database **before** deploying the code that expects it. Because of `ddl-auto=validate`, deploying code first will crash-loop the API on startup.

---

## Database

Eight tables:

| Table | Purpose |
|---|---|
| `users` | All roles (farmer, retailer, distributor, customer, admin) plus the customer's saved default address |
| `products` | Listings, including product type, AI quality score, freshness %, analysis and AI-generated details |
| `orders` | Order header: customer, total, derived status, delivery address/coordinates, payment method |
| `order_items` | Per-item retailer, farmer, **status, distributor** |
| `order_item_status_events` | Append-only status history behind the timeline |
| `farmer_retailers` | Farmer ↔ retailer assignments |
| `retailer_distributors` | Retailer ↔ distributor history |
| `password_reset_tokens` | Password reset support |

Schema changes were applied by hand and are recorded, in order and with the reasoning behind each, in `backend/docs/database-migration-history.sql`.

---

## API overview

| Area | Endpoints |
|---|---|
| Users | `POST /api/users/register`, `POST /api/users/login`, `GET /api/users/me`, `GET /api/users/all` (admin, password-free) |
| Products | `POST /api/products/add` (multipart; runs the AI gate server-side), `GET /api/products/customer/products`, `GET /api/products/farmer/me`, `GET /api/products/{id}`, `PUT` / `DELETE /api/products/{id}` |
| Orders | `POST /api/orders`, `GET /api/orders/{customer\|retailer\|distributor\|farmer}`, `GET /api/orders/{id}`, `GET /api/orders/{id}/trace` |
| Fulfilment | `PUT /api/orders/{id}/confirm`, `/pack`, `/ship`, `/deliver`, `/cancel` |

Protected endpoints expect `Authorization: Bearer <jwt>`.

---

## Known limitations

- **Payment:** only Cash on Delivery is functional. UPI / Card / Wallet are shown as "Coming soon".
- **AI gate is strict by design:** if Gemini is unavailable, quota-limited or returns an error, a farmer **cannot list a product** until it recovers. The backend retries transient `503` errors once; free-tier quota and model availability are outside the app's control.
- **Wishlist** lives in browser memory only and is lost on refresh or logout.
- **No live delivery map** — the timeline shows status history, not a moving location.
- **No automated test suite** yet.
- **Hosting:** free-tier cold starts on the API; free-tier Gemini limits.

---

## Roadmap

- Surface the Fresh Harvest / Stored Stock distinction in the order timeline itself (see *Product types* above)
- Live delivery tracking (delivery address and coordinates are already captured)
- Real payment gateway (e.g. Razorpay)
- Persist the wishlist server-side
- Map-based farm discovery using the stored coordinates
- Farmer / admin analytics dashboard
- Versioned migrations (Flyway) and automated tests

---

## Security

See [SECURITY.md](SECURITY.md). Passwords are BCrypt-hashed and never returned to the client in any form. All secrets come from environment variables, endpoint access is enforced server-side by Spring Security roles, and the AI quality gate is enforced by the backend, not trusted from client input.

---

© 2026 GreenLoop. All rights reserved.
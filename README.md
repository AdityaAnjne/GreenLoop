# 🌿 GreenLoop — Farm to Door, Fully Traced

## 📌 Overview

**GreenLoop** is a full-stack agricultural marketplace and supply-chain platform that connects **farmers, retailers, distributors, and customers** in one transparent loop — from harvest to doorstep.

Every product carries a **QR code** that lets anyone trace its journey through the supply chain, and an **AI-powered quality check** (via Google Gemini) lets customers assess freshness from a photo before they buy.

The supply chain itself is **explicitly assigned, not automatic**: a farmer chooses which retailer sells each product, and a retailer chooses which distributor fulfills each order. No order is ever visible to — or actionable by — anyone outside that chosen chain.

---

## ✨ Features

- **Role-based dashboards** for Farmer, Retailer, Distributor, Customer, and Admin — each with its own permissions and views
- **Farmer-controlled retailer assignment** — when adding or editing a product, a farmer picks exactly which registered retailer account receives it
- **Retailer-controlled distributor assignment** — when confirming an order, a retailer picks exactly which registered distributor account fulfills it
- **Strict order visibility** — an order is only ever visible to the customer who placed it, the retailer whose product it contains, and (once confirmed) the distributor assigned to it. No other retailer or distributor can see or act on it, enforced at the backend, not just hidden in the UI
- **Full order lifecycle**: `PLACED → CONFIRMED → PACKED → SHIPPED → DELIVERED`, with each role responsible for its own step
- **Real image uploads** via Cloudinary — farmers attach real photos to every product listing
- **QR code traceability** — every product gets a scannable code linking to its public detail page
- **AI Quality Check** — customers can upload a photo of produce and get an AI-generated freshness/quality assessment
- **JWT authentication** with role-based route and endpoint protection
- **Order tracking** — customers can see their full order history and live status
- **Admin panel** — manage users and view platform-wide product data

## 👥 Roles

| Role | Can do |
|---|---|
| **Farmer** | Add/edit/delete products, set price & quantity, assign (and later reassign) which retailer sells each product, view their own listings |
| **Retailer** | View orders containing their own products, confirm an order by assigning it to a distributor, track that distributor's progress |
| **Distributor** | View only the orders assigned to them by a retailer, pack, ship, and mark delivery complete |
| **Customer** | Browse products, checkout, track orders, run AI quality checks |
| **Admin** | View all users and products (provisioned directly in the database, not self-registrable) |

## 🔗 Supply Chain Authorization Model

```text
Customer places order
        ↓
Product belongs to Farmer
        ↓
Farmer has assigned this product to a Retailer
        ↓
Order is visible ONLY to that Retailer
        ↓
Retailer confirms the order and picks a Distributor
        ↓
Order is visible ONLY to that Distributor
        ↓
Distributor packs → ships → delivers
        ↓
Customer receives product
```

Every step above is enforced server-side:

- A farmer can only assign a product to an account that actually has the `retailer` role.
- A retailer can only confirm orders that contain their own products (checked against `order_items.retailer_id`, not trusted from the frontend).
- A retailer can only assign an order to an account that actually has the `distributor` role.
- Once assigned, a distributor can only pack/ship/deliver an order if `order.distributor_id` matches their own account ID — a different distributor gets a `403 Forbidden`, not the order.
- Fetching a single order's details (`GET /api/orders/{id}`) checks that the requester is the order's customer, its retailer, its assigned distributor, or an admin — anyone else gets a `404`, not order data, so the endpoint doesn't even reveal that the order exists.

---

## 🛠️ Tech Stack

**Backend:** Java 17, Spring Boot 3.5, Spring Security, JWT, Hibernate/JPA, MySQL
**Frontend:** React 18, React Router, Tailwind CSS, Axios
**Integrations:** Cloudinary (image hosting), Google Gemini (AI quality analysis)

---

## 🚀 Local Setup

### Prerequisites
- Java 17+ and Maven
- Node.js and npm
- A MySQL server (local or cloud)
- A free [Cloudinary](https://cloudinary.com) account
- A free [Gemini API key](https://aistudio.google.com)

### 1. Clone the repo
```bash
git clone https://github.com/AdityaAnjne/GreenLoop.git
cd GreenLoop
```

### 2. Backend setup
Copy the example config and fill in your own values:
```bash
cd backend/src/main/resources
cp application.properties.example application.properties
```
Edit `application.properties` with your MySQL credentials, Cloudinary keys, and Gemini API key.

> ⚠️ Cloudinary requires **three separate values** — `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — not the combined `CLOUDINARY_URL` format. Copy each one individually from your Cloudinary dashboard.

Then run:
```bash
cd ../../../..
mvn spring-boot:run
```
The backend starts on `http://localhost:8080`.

### 3. Frontend setup
From the project root:
```bash
npm install
cp .env.example .env
npm start
```
The frontend starts on `http://localhost:3000`.

### 4. First-time data setup
Since retailer and distributor assignment is explicit, register at least one account of each role (`farmer`, `retailer`, `distributor`, `customer`) before testing the full flow:

1. Register a farmer → add a product → select a retailer from the dropdown
2. Register a customer → buy that product
3. Log in as the retailer → confirm the order → select a distributor from the dropdown
4. Log in as the distributor → pack → ship → deliver

If you need to reset test data at any point (clear all orders and start the assignment flow fresh), see `cleanup_and_backfill.sql` in the project — it truncates order history and relationship tables without touching user accounts.

---

## ☁️ Deployment

This project is designed to deploy on free-tier services:

| Layer | Suggested service |
|---|---|
| Database | [Aiven](https://aiven.io) — free MySQL |
| Backend | [Render](https://render.com) — free Java web service |
| Frontend | [Vercel](https://vercel.com) — free static hosting |

All configuration is environment-variable driven, so no code changes are needed between local development and production — just set the right environment variables on your hosting platform.

**Backend environment variables required:**
```
DB_URL, DB_USERNAME, DB_PASSWORD
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
GEMINI_API_KEY
JWT_SECRET
FRONTEND_URL
```

**Frontend environment variable required:**
```
REACT_APP_API_BASE_URL
```

> ⚠️ Before going live: make sure `FRONTEND_URL` on your backend host exactly matches your deployed frontend's URL (including `https://`, no trailing slash) — CORS is single-origin, so a mismatch here will silently break every API call in production even though it works fine on localhost. Also make sure `JWT_SECRET` is set to a real random value on your host, not left on the local default fallback.

---

## 📁 Project Structure

```
GreenLoop/
├── backend/                # Spring Boot API
│   └── src/main/java/com/greenloop/
│       ├── controller/      # REST endpoints (products, orders, network, users, auth)
│       ├── service/         # Business logic (ownership checks, order lifecycle)
│       ├── repository/      # Data access
│       ├── model/           # JPA entities (User, Product, Order, OrderItem, FarmerRetailer, RetailerDistributor)
│       └── security/        # JWT + Spring Security config
├── src/                    # React frontend
│   ├── pages/                 # Route-level pages (dashboards, auth, product forms)
│   ├── components/            # Shared UI components (Navbar, Footer, PrivateRoute)
│   ├── api/                   # Axios instance + API calls
│   └── styles/                # Theme and CSS
└── public/                 # Static assets
```

---

## 🔒 Security Notes

- Passwords are hashed with BCrypt
- All sensitive config lives in environment variables, never committed to source control
- Role-based access is enforced at both the frontend (route guards) and backend (Spring Security + per-endpoint checks) — the backend is the real security boundary
- Order and product ownership is enforced by cross-checking the JWT-derived user ID against the actual database relationships (`retailer_id`, `distributor_id`, `farmer_id`) on every mutation — never trusted from request parameters
- Admin accounts must be provisioned directly in the database; there is no self-registration path for the admin role

---

## 📄 License

This project does not currently specify a license. If you plan to reuse or distribute this code, please add a `LICENSE` file reflecting your intended terms.

---

Copyright © 2026 Aditya Anjne. All rights reserved.

Made with ❤️ by [Aditya Anjne](https://github.com/AdityaAnjne)
# B2B Order Management System

Full-stack B2B OMS: one **admin** (product and order management), many **customers** (catalog, orders, PDF invoices). Payments are **offline**; order statuses are `CREATED` → `CONFIRMED` → `COMPLETED`.

## Architecture

| Layer | Responsibility |
|--------|----------------|
| `src/app/api/**` | REST route handlers (thin): parse input, auth, call services, return JSON/PDF |
| `src/server/services/**` | Business logic (orders, products, auth, invoices) |
| `src/server/validation/**` | Zod schemas |
| `src/lib/**` | DB singleton, JWT, HTTP helpers |
| `src/app/**` (pages) | Next.js App Router UI (admin + customer) |
| `prisma/` | Schema and SQL migrations |

Stock lives on **`product_variants`**. Each order line references a variant; stock is reduced **in a transaction** with `updateMany` + `stock >= quantity` so concurrent orders cannot oversell. **Simple** products use a single variant (e.g. size `Standard`); **variant** products have 2+ sizes and require the customer to choose one when ordering.

## Tech stack

- **Frontend:** Next.js 15 (React 19), Tailwind CSS 4  
- **Backend:** Next.js Route Handlers (same app)  
- **Database:** PostgreSQL + Prisma ORM  
- **Auth:** JWT in **httpOnly** cookie (`auth_token`)

## Prerequisites

- Node.js 20+  
- PostgreSQL 14+ **running** and reachable at `DATABASE_URL` (seed/migrate fail with `Can't reach database server` if nothing listens there)

**Quick local DB (Docker):** from repo root, `docker compose up -d`, then set  
`DATABASE_URL="postgresql://postgres:postgres@localhost:5432/b2b_oms?schema=public"` in `.env`.

## Local setup

1. **Clone and install**

   ```bash
   cd B2B-Blinds
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   - `DATABASE_URL` — PostgreSQL connection string  
   - `JWT_SECRET` — at least 32 random characters  
  - `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` — used by seed to recreate the single admin user  
  - `CUSTOMER_NAME` / `CUSTOMER_EMAIL` / `CUSTOMER_PASSWORD` — used by seed to recreate one test customer user  

3. **Database**

   ```bash
   npx prisma migrate deploy
   # or during development:
   npx prisma migrate dev
   ```

4. **Seed admin + categories**

   ```bash
   npm run db:seed
   ```

   Optional: place **`prisma/products.xlsx`** (first sheet) to import products. Expected columns (header names are matched case-insensitively): **Category**, **ProductName** (or Product), **Price**, **Stock**; optional **HasVariants**, **Size**, **Unit** (`PIECE` / `METER`). Same category + product name groups rows into one product; **2+ rows ⇒ variant product** automatically.

5. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

- **Admin:** sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.  
- **Customer (seeded test user):** sign in with `CUSTOMER_EMAIL` / `CUSTOMER_PASSWORD` from `.env`.
- You can still register additional customers at `/register` (the admin email cannot be used for registration).

## REST API (summary)

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/auth/login` | — |
| `POST` | `/api/auth/register` | — |
| `POST` | `/api/auth/logout` | — |
| `GET` | `/api/auth/me` | JWT |
| `GET` | `/api/products` | Optional (admin sees all; guest/customer sees active only) |
| `POST` | `/api/products` | Admin |
| `PUT` | `/api/products/[id]` | Admin |
| `DELETE` | `/api/products/[id]` | Admin |
| `GET` | `/api/products/[id]` | Admin |
| `POST` | `/api/products/[id]/variants` | Admin |
| `PUT` | `/api/products/[id]/variants/[variantId]` | Admin |
| `DELETE` | `/api/products/[id]/variants/[variantId]` | Admin |
| `GET` | `/api/categories` | — |
| `POST` | `/api/orders` | Customer |
| `GET` | `/api/orders/my` | Customer |
| `GET` | `/api/orders` | Admin |
| `GET` | `/api/orders/[id]` | Owner or admin |
| `PUT` | `/api/orders/[id]/status` | Admin |
| `GET` | `/api/orders/[id]/invoice` | Owner or admin (PDF) |

Use `credentials: 'include'` from the browser so the auth cookie is sent.

## Database schema (reference)

Canonical definition: `prisma/schema.prisma`. Applied SQL: `prisma/migrations/*/migration.sql`.

Tables: `users`, `categories`, `products`, `orders`, `order_items` with the fields described in your specification (including order line snapshots: `product_name`, `price`, `quantity`, `total`).

## Production notes

- Set strong `JWT_SECRET`, use HTTPS, keep `secure: true` on cookies (already tied to `NODE_ENV === "production"`).  
- Run `npm run build` and `npm start` behind a reverse proxy.  
- Point `DATABASE_URL` at your managed PostgreSQL instance.  
- Change the seeded admin password after first login (edit user in DB or add a “change password” flow later).

## Folder structure (high level)

```
prisma/
  schema.prisma
  migrations/
  seed.ts
src/
  app/
    api/…              # REST handlers
    admin/…            # Admin UI
    catalog/…
    orders/…
    login/, register/
    layout.tsx, page.tsx, globals.css
  components/          # Shared UI (forms, shell)
  lib/                 # db, auth, api client
  server/
    services/          # Domain logic
    validation/
    errors.ts
    serialize.ts
  middleware.ts
```

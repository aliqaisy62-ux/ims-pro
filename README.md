# IMS-Pro — Inventory & Point-of-Sale Management System

A full-stack commercial POS and inventory system built for the Iraqi market, supporting dual currency (USD + IQD) and bilingual Arabic/English UI.

## Features

- **Dual currency** — USD and IQD with live exchange rate
- **Bilingual** — Arabic (RTL) + English (LTR) per user
- **6 user roles** — Admin, Manager, Cashier, Accountant, Viewer, and public registration
- **Barcode scanning** — USB scanner and camera support
- **5 price types** — per item (retail, wholesale, etc.)
- **Full invoicing** — sales + purchase invoices with confirm / cancel / return flows
- **Cash statement** — daily opening/closing balances with receipts, disbursements, expenses
- **Payment vouchers** — receipt and disbursement vouchers linked to customers/suppliers
- **Reports** — PDF and Excel export
- **Windows desktop app** — self-contained Electron installer (no Node.js required on client)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js |
| Database | SQLite (dev) via Prisma ORM |
| Auth | JWT (access + refresh) + RBAC |
| Monorepo | Turborepo |
| Desktop | Electron 31 + NSIS installer |

## How to Run (Development)

### Prerequisites

- Node.js 20+
- npm 10+

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/ims-pro.git
cd ims-pro

# 2. Install all dependencies (monorepo root)
npm install

# 3. Create and migrate the SQLite database
cd packages/db
npx prisma migrate dev --schema prisma/schema.prisma

# 4. Seed initial data (admin user + categories + settings)
npx prisma db seed

# 5. Go back to root and start the dev servers
cd ../..
npx turbo run dev --filter=@ims-pro/api --filter=@ims-pro/web
```

The app will be available at:
- **Web UI**: http://localhost:3001
- **API**: http://localhost:4001

### First Run Administrator Setup

No default credentials exist. The application ships with no pre-seeded users.

Create the initial admin account before first launch:

```bash
# Set in your .env file — never commit real passwords
SEED_DB=true
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=<choose-a-strong-password>
```

Demo accounts (`manager1`, `cashier1`) are disabled in production (`NODE_ENV=production`).
They can only be seeded in development by setting `SEED_DEMO_MANAGER_PASSWORD` and
`SEED_DEMO_CASHIER_PASSWORD` in your local `.env`.

## Environment Files

Copy `.env.example` to `.env` and fill in every `<REQUIRED>` placeholder before running.
Never commit `.env` files — they are excluded by `.gitignore`.

Required variables:

```
DB_USER             Database username
DB_PASSWORD         Database password (use a strong random value)
DATABASE_URL        Full PostgreSQL connection string
JWT_SECRET          64-byte random string  (openssl rand -base64 64)
JWT_REFRESH_SECRET  64-byte random string  (openssl rand -base64 64)
ALLOWED_ORIGINS     Allowed frontend origin(s) — required in production
SEED_ADMIN_PASSWORD Strong password for the initial admin (when SEED_DB=true)
```

## Project Structure

```
ims-pro/
├── apps/
│   ├── api/          # Express.js REST API
│   ├── web/          # Next.js 14 frontend
│   └── desktop/      # Electron Windows app
├── packages/
│   ├── db/           # Prisma schema + migrations + seed
│   └── types/        # Shared TypeScript types
└── data/             # SQLite database (git-ignored)
```

See `CLAUDE.md` for full architecture, strict rules, and development guidelines.

## Building the Windows Desktop App

```powershell
cd apps/desktop
./build.ps1
```

Output: `apps/desktop/dist/IMS-Pro Setup <version>.exe`

The installer is self-contained — it bundles Node.js, the API, the Next.js frontend, and a seeded SQLite database. No dependencies required on the client machine.

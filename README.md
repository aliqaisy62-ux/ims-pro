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

### Default Login

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin (full access) |
| `manager1` | `manager123` | Manager |
| `cashier1` | `cashier123` | Cashier |

## Environment Files

The project uses two `.env` files that are **not committed** (excluded by `.gitignore`):

**`apps/api/.env`**
```env
DATABASE_URL="file:../../../data/cashier.db"
JWT_SECRET="change-this-before-production"
JWT_REFRESH_SECRET="change-this-before-production"
PORT=4001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001
```

**`apps/web/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:4001
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

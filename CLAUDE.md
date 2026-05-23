# IMS-Pro — Claude Code Project Memory
# Loaded automatically at every session start.
# Last updated: 2026-05-23

---

## 🧠 WHO YOU ARE

You are a senior Full Stack Developer, Professional Programmer, and Data Analyst building
**IMS-Pro** — a commercial Inventory and Point-of-Sale Management System.

Target: Iraqi market. Language: Arabic (primary, RTL) + English. Currency: IQD + USD.

**Tech Stack:**
- Frontend: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui + tailwindcss-animate
- Backend: Node.js + Express.js + tsx watch (dev)
- Database: PostgreSQL 15 + Prisma ORM (port 5434 via Docker)
- Auth: JWT (bcryptjs) + RBAC (6 roles) + HttpOnly refresh cookie
- Mobile: Capacitor 6 + Android (appId: com.etana.app)
- Barcode: html5-qrcode (camera scanner) + react-barcode
- Reports: jsPDF + jspdf-autotable + exceljs + Recharts
- Deployment: Docker + Nginx (LAN-hosted)

---

## ⚠️ STRICT RULES — READ BEFORE EVERY TASK

### RULE 1 — NO CODE DUPLICATION
Before writing any function, component, hook, utility, or query:
- Search the codebase for similar logic.
- If found: reuse or extend it — NEVER copy.
- Generic logic lives in: /lib/utils, /hooks, /services only.

### RULE 2 — MANDATORY PHASE REVIEW
At the end of every section:
- Review all files created or modified.
- Check for: unused imports, dead code, magic numbers, duplicate logic.
- Refactor before proceeding.
- Output a Phase Review Summary.

### RULE 3 — MODEL TIER (auto-select, state in task header)
- HAIKU  → simple CRUD, basic UI, standard queries
- SONNET → business logic, multi-table queries, reports, auth
- OPUS   → architecture, security design, complex business rules, billing, profit engine

### RULE 4 — TOKEN BUDGET
- At 70%: warn user.
- At 90%: STOP. Generate Progress Report. Preserve all state.
- Next session: load report, verify state, continue from checkpoint.

### RULE 5 — 13-LAYER ARCHITECTURE COMPLIANCE
Respect all 13 stack layers: Frontend → API → DB → Auth → Hosting → Cloud →
CI/CD → Security → Rate Limiting → Caching → Scaling → Logging → Availability.
Security and Auth checks at BOTH frontend and backend.

### RULE 6 — BILINGUAL FIRST
All UI strings use i18n keys. Zero hardcoded Arabic or English text in components.
RTL layout auto-applied when language = "ar".

### RULE 7 — DUAL CURRENCY THROUGHOUT
Every monetary value stored with its currency code (USD or IQD).
Exchange rate stored at time of transaction — never recalculated retroactively.
Exchange rate configurable in Settings only.

### RULE 8 — ATOMIC COMMITS
One task = one atomic git commit.
Format: `type(scope): description  [MODEL_TIER]`
Example: `feat(invoices): add dual-currency sales invoice generator  [SONNET]`

---

## 🌐 RUNNING ENVIRONMENT

| Service     | URL                              | Notes                        |
|-------------|----------------------------------|------------------------------|
| Next.js     | http://localhost:3001            | `npm run dev` in apps/web    |
| Express API | http://localhost:4001            | `npm run dev` in apps/api    |
| PostgreSQL  | localhost:5434                   | Docker container `ims-pro-db`|
| Public IP   | http://212.95.151.51:3001        | LAN IP: 10.110.210.134       |

**Default credentials:** `admin` / `admin123`

**Key env files:**
- `apps/web/.env.local`  → `NEXT_PUBLIC_API_URL=http://10.110.210.134:4001`
- `apps/api/.env`        → DB, JWT, CORS, PORT=4001

**CORS allowed origins:** localhost:3001, 212.95.151.51:3001, 10.110.210.134:3001
LAN private-IP regex also auto-allowed in `apps/api/src/index.ts`.

---

## 📁 PROJECT STRUCTURE

```
/ims-pro
├── /apps
│   ├── /web          → Next.js 14 (App Router, port 3001)
│   │   ├── /src/app/(auth)/login
│   │   ├── /src/app/(dashboard)/   ← all protected pages
│   │   ├── /src/components/
│   │   │   ├── /barcode/CameraScanner.tsx   ← scanner + overlay + toast
│   │   │   ├── /layout/DashboardShell.tsx
│   │   │   ├── /layout/Sidebar.tsx          ← mobile overlay + haptics
│   │   │   ├── /layout/Topbar.tsx
│   │   │   ├── /layout/PageTransition.tsx
│   │   │   └── /ui/TableSkeleton.tsx
│   │   │   └── /ui/VirtualTable.tsx         ← virtual scroll
│   │   ├── /src/services/           ← API service layer
│   │   ├── /src/hooks/              ← useAuth, etc.
│   │   ├── /src/lib/                ← api.ts, haptics.ts
│   │   └── /android/                ← Capacitor Android project
│   └── /api          → Express.js REST API (port 4001)
│       └── /src/
│           ├── /routes/             ← 12 route files
│           ├── /controllers/        ← business logic
│           ├── /services/           ← auth, etc.
│           └── /middleware/         ← auth, validateRequest
├── /packages
│   ├── /db           → Prisma schema + migrations + seed
│   ├── /i18n         → ar.json + en.json translations
│   ├── /types        → Shared TypeScript types (AuthUser, etc.)
│   └── /ui           → Shared shadcn/ui components
├── CLAUDE.md         → This file (project memory)
├── ROADMAP.md        → Full project roadmap
└── docker-compose.yml
```

---

## 🗄️ DATABASE — PRISMA MODELS (summary)

| Model               | Key Fields                                                        |
|---------------------|-------------------------------------------------------------------|
| User                | username, passwordHash, role(6), language, isActive              |
| Item                | barcode, name_ar/en, 6 prices, stockQty, minimumStock, expiryDate|
| Category            | name_ar, name_en                                                  |
| Customer            | name, phone, type(RETAIL/WHOLESALE), creditLimit, balance        |
| Supplier            | name, phone, balance, currency                                    |
| SalesInvoice        | invoiceNumber, type(CASH/CREDIT), priceType(5), currency, total  |
| SalesInvoiceItem    | quantity, unitPrice, currency, subtotal, expiryDate              |
| PurchaseInvoice     | invoiceNumber, supplierId, currency, exchangeRate, total         |
| PurchaseInvoiceItem | quantity, unitCost, currency, subtotal, expiryDate               |
| Expense             | categoryId, amount, currency, exchangeRate, date                 |
| ExpenseCategory     | name_ar, name_en                                                  |
| StockTransfer       | type(IN/OUT), itemId, quantity, reason(5 types)                  |
| PaymentVoucher      | voucherNumber, type(DISBURSEMENT/RECEIPT), entityType, amount    |
| CashStatement       | date(unique), openingBalance/closingBalance USD+IQD, isClosed    |
| ExchangeRateHistory | rateIQD, changedById                                             |
| Settings            | key(unique), value                                               |

**Rules:** All monetary = Decimal(15,3) | Soft deletes (isActive) | Full index coverage

---

## 🔐 ROLES

| Role       | Access                                                  |
|------------|---------------------------------------------------------|
| ADMIN      | Full access including user management + settings        |
| MANAGER    | All except user management                              |
| CASHIER    | Sales invoices + receipts + customer lookup             |
| VIEWER     | Read-only reports + inventory                           |
| ACCOUNTANT | Expenses, vouchers, suppliers, reports, cash-statement  |
| STAFF      | Sales, customers, items (no reports, no settings)       |

---

## 💱 PRICE TYPES

| Type      | Currency | Field               |
|-----------|----------|---------------------|
| RETAIL    | IQD      | item.retailPrice    |
| WHOLESALE | IQD      | item.wholesalePrice |
| SPECIAL   | IQD      | item.specialPrice   |
| DOLLAR    | USD      | item.dollarPrice    |
| DINAR     | IQD      | item.dinarPrice     |

---

## 🏗️ COMPLETED FEATURES (as of 2026-05-23)

### Backend API ✅
- Auth: JWT login/refresh/logout/me + rate limiting (5/15min)
- Items: full CRUD + barcode lookup + categories
- Customers: full CRUD + account statement
- Suppliers: full CRUD + account statement
- Sales invoices: create/list/view/status + stock auto-deduction
- Purchase invoices: create/list/view + stock auto-increment
- Expenses: full CRUD + categories
- Vouchers: disbursement/receipt + customer/supplier linking
- Stock transfers: IN/OUT with reason codes
- Inventory: general / low-stock / expiring tabs
- Cash statement: daily open/close with USD+IQD balances
- Settings: key-value store + exchange rate history
- Reports: sales, purchases, profit, inventory, customer statement, supplier statement

### Frontend Pages ✅
- Login page with JWT auth + silent refresh
- Dashboard with KPI cards + Recharts
- Items list (infinite scroll) + new + edit + barcode scanner
- Customers list + new + view + account statement
- Suppliers list + new + view + account statement
- Sales invoices list + new POS form + view + print
- Purchase invoices list + new form + view + print
- Expenses list + new + edit
- Vouchers list + new + view + print
- Stock transfers list
- Inventory (virtual scroll) — general/low-stock/expiring tabs
- Cash statement daily view
- Reports: 6 report types with PDF/Excel export
- Settings: app config + exchange rate + user management
- Staff management (ADMIN only)

### UI/UX ✅
- RTL Arabic layout throughout
- Dark mode (CSS variables)
- Skeleton screens (TableSkeleton) on all loading states
- Page transitions (slide+fade, 200ms)
- Mobile sidebar overlay + desktop collapse
- Haptic feedback on nav (Capacitor)
- Barcode camera scanner with laser overlay + toast notifications
- Virtual scrolling (VirtualTable — inventory)
- Infinite scroll (items page)
- WCAG 2.5.5 — 44px min touch targets on all buttons
- Capacitor Android project (appId: com.etana.app)

---

## 📋 SECTION COMMAND MAP

| Command           | Section                          | Status    |
|-------------------|----------------------------------|-----------|
| `/build:section0` | Role & Rules Setup               | ✅ DONE   |
| `/build:section1` | Project Initialization           | ✅ DONE   |
| `/build:section2` | Database Schema & Migrations     | ✅ DONE   |
| `/build:section3` | Authentication & Authorization   | ✅ DONE   |
| `/build:section4` | Item & Barcode Management        | ✅ DONE   |
| `/build:section5` | Customers & Suppliers            | ✅ DONE   |
| `/build:section6` | Sales Invoices (Core POS)        | ✅ DONE   |
| `/build:section7` | Purchase Invoices                | ✅ DONE   |
| `/build:section8` | Expenses Management              | ✅ DONE   |
| `/build:section9` | Vouchers                         | ✅ DONE   |
| `/build:section10`| Stock Transfer & Inventory       | ✅ DONE   |
| `/build:section11`| Cash Statement                   | ✅ DONE   |
| `/build:section12`| Reports Module                   | ✅ DONE   |
| `/build:section13`| Settings & Configuration         | ✅ DONE   |
| `/build:section14`| Network / Deployment             | 🔄 IN PROGRESS |
| `/build:section15`| UI/UX Finalization               | ✅ DONE   |
| `/build:section16`| Mobile APK Production Build      | ⏳ PENDING |
| `/build:section17`| Testing & QA                     | ⏳ PENDING |
| `/build:section18`| Advanced Features                | ⏳ PENDING |

---

## ⏸️ PROGRESS REPORT TEMPLATE

```
══════════════════════════════════════════════
SESSION PROGRESS REPORT — IMS-Pro
Generated: [TIMESTAMP]
Token Usage: [X]% of budget
══════════════════════════════════════════════
✅ COMPLETED: [list]
🔄 IN PROGRESS:
  Section: [N — Name]
  Last task: [description]
  Next task: [description]
  Files modified: [list]
⏳ PENDING: [list]
📁 KEY FILES: [and status]
🔗 BLOCKING: [dependencies]
📝 NOTES: [decisions, warnings]
RESUME: /build:sectionN
══════════════════════════════════════════════
```

---

*IMS-Pro CLAUDE.md v2.0 — Updated 2026-05-23 | 18 sections | Arabic RTL + English LTR | IQD + USD | Capacitor Android*

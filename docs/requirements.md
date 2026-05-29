# IMS-Pro — System Requirements
# متطلبات نظام IMS-Pro

Based on the Square PRO POS System specification for the Iraqi retail market.

---

## 1. Overview / نظرة عامة

IMS-Pro is a full-featured inventory and point-of-sale management system targeting Iraqi retail businesses. It runs as a LAN-hosted web application with an Android mobile companion, supporting bilingual (Arabic RTL primary, English LTR) operation with dual-currency (IQD + USD) throughout.

---

## 2. Roles & Permissions / الأدوار والصلاحيات

| Role | Arabic | Access |
|------|--------|--------|
| ADMIN | مدير النظام | Full access including user management, settings, audit logs |
| MANAGER | مدير | All except user management |
| CASHIER | كاشير | POS, sales invoices, customer lookup, receipts |
| ACCOUNTANT | محاسب | Expenses, vouchers, suppliers, reports, cash statement |
| STAFF | موظف | Sales, customers, items (no reports, no settings) |
| VIEWER | مستعرض | Read-only reports and inventory |

---

## 3. Core Features / الميزات الأساسية

### 3.1 Point of Sale (POS) / نقطة البيع

- Barcode scan via USB/Bluetooth scanner (keyboard wedge, 200ms gap detection)
- Manual product search by name or barcode
- 5 price types: RETAIL, WHOLESALE, SPECIAL, DOLLAR, DINAR
- Dual currency checkout: IQD or USD
- Payment methods: CASH or CREDIT
- IQD denomination quick-buttons: 250, 500, 1,000, 5,000, 10,000, 25,000, 50,000
- Automatic change calculation
- Audio feedback: beep on successful scan, buzz on not-found error
- Print receipt on checkout (CONFIRMED invoices only)
- Atomic stock deduction at checkout (Serializable transaction)

### 3.2 Inventory Management / إدارة المخزون

- Item CRUD with barcode, dual-language names, 5 price tiers
- Cost price tracking for profit calculations
- Expiry date tracking per item and per invoice line
- Minimum stock threshold with low-stock alerts
- Stock transfers IN/OUT with reason codes (5 types)
- Inventory reports: general, low-stock, expiring
- Virtual scroll for large catalogs (10,000+ items)
- Bulk import via Excel (.xlsx) with validation

### 3.3 Sales Invoices / فواتير المبيعات

- Auto-generated invoice numbers (INV-YYYYMMDD-XXXX)
- DRAFT → CONFIRMED → CANCELLED/RETURNED lifecycle
- CASH and CREDIT types; credit requires a linked customer
- Exchange rate recorded at time of invoice (never retroactive)
- Partial return support
- PDF print output

### 3.4 Purchase Invoices / فواتير المشتريات

- Auto-generated PO numbers
- Supplier linking
- Stock auto-increment on confirmation
- Dual-currency support with exchange rate capture

### 3.5 Customer Management / إدارة العملاء

- RETAIL / WHOLESALE customer types
- Credit limit enforcement on credit invoices
- Running balance tracking
- Customer account statement report

### 3.6 Supplier Management / إدارة الموردين

- Supplier account statement
- Balance tracking per currency
- Payment disbursement vouchers

### 3.7 Expenses / المصروفات

- Category-based expense tracking
- Dual-currency with exchange rate
- Date-range reports

### 3.8 Payment Vouchers / سندات القبض والصرف

- RECEIPT (from customers) and DISBURSEMENT (to suppliers)
- Auto-numbered vouchers
- Linked to customer or supplier balance
- PDF print output

### 3.9 Cash Statement / كشف الصندوق

- Daily open/close with USD + IQD opening/closing balances
- One statement per date (unique constraint)
- Aggregate totals: sales, purchases, expenses, vouchers

### 3.10 Reports / التقارير

| Report | Arabic |
|--------|--------|
| Sales Report | تقرير المبيعات |
| Purchases Report | تقرير المشتريات |
| Profit Report | تقرير الأرباح |
| Inventory Report | تقرير الجرد |
| Customer Statement | كشف حساب عميل |
| Supplier Statement | كشف حساب مورد |
| Top Sellers | أكثر المنتجات مبيعاً |
| Peak Hours | أوقات الذروة |

All reports support date-range filtering. Sales/Purchases/Profit support PDF and Excel export.

### 3.11 Audit Log / سجل التدقيق

- Records: LOGIN, LOGOUT, CREATE, UPDATE, DELETE, EXPORT actions
- Entities tracked: User, SalesInvoice, Item (extensible)
- Stores: userId, action, entity, entityId, details (JSON), ipAddress, timestamp
- Accessible by ADMIN only
- Paginated and filterable by user/action/entity/date range

---

## 4. Technical Architecture / البنية التقنية

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 15 + Prisma ORM |
| Auth | JWT (access + refresh) + RBAC + bcryptjs |
| Mobile | Capacitor 6 + Android (com.etana.app) |
| Barcode | html5-qrcode (camera) + keyboard wedge (POS) |
| Reports | jsPDF + jspdf-autotable + exceljs + Recharts |
| Deployment | Docker + Nginx (LAN-hosted) |

### API Endpoints

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Login, refresh, logout, me |
| `/api/items` | Item CRUD + barcode lookup + categories |
| `/api/customers` | Customer CRUD |
| `/api/suppliers` | Supplier CRUD |
| `/api/sales` | Sales invoice lifecycle |
| `/api/purchases` | Purchase invoice lifecycle |
| `/api/expenses` | Expenses + categories |
| `/api/vouchers` | Payment vouchers |
| `/api/stock` | Stock transfers |
| `/api/cash-statement` | Daily cash statement |
| `/api/settings` | App settings + exchange rates |
| `/api/reports` | All report endpoints |
| `/api/pos` | POS checkout (atomic) |
| `/api/system` | DB migration (ADMIN) |
| `/api/audit` | Audit log (ADMIN) |

### Security

- JWT with 15-minute access token + 7-day HttpOnly refresh cookie
- Role enforcement at both Next.js middleware (routing) and API middleware
- Rate limiting: 500 req/15min general; 5 req/15min on auth endpoints
- Helmet.js security headers
- CORS: explicit allow-list + LAN subnet auto-allow

---

## 5. Currency Rules / قواعد العملة

- All monetary values stored as `Decimal(15,3)`
- Exchange rate (IQD per USD) stored at time of every transaction
- Rate never recalculated retroactively
- Rate configurable in Settings → Exchange Rate History tab
- IQD is the base/display currency for all IQD reports
- USD amounts converted to IQD using stored exchange rate for aggregation

---

## 6. Deployment / النشر

- Docker Compose stack: Next.js + Express API + PostgreSQL
- Nginx reverse proxy on port 80
- LAN access: `http://<server-ip>:3001` (web) + `http://<server-ip>:4001` (API)
- Database migrations via `POST /api/system/db-push` (ADMIN, self-healing)
- Android APK via Capacitor (`npx cap build android`)

---

## 7. Future Roadmap / خارطة الطريق

- [ ] WebSocket mobile barcode scanner (dedicated device → POS session)
- [ ] Multi-branch inventory transfers
- [ ] Customer loyalty points
- [ ] Supplier price lists
- [ ] Automated daily backup to cloud storage
- [ ] WhatsApp invoice delivery integration
- [ ] Offline-first PWA mode

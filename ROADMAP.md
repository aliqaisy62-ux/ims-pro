# IMS-Pro — Project Roadmap
# Last updated: 2026-05-23

---

## 📊 Overall Progress: ~80% Complete

```
[████████████████████░░░░░] 80%
Core system built. Mobile + production deployment + advanced features remaining.
```

---

## ✅ PHASE 1 — Foundation (COMPLETE)

| Task | Status |
|------|--------|
| Monorepo setup (apps/web, apps/api, packages/) | ✅ |
| PostgreSQL + Prisma schema (16 models, full indexes) | ✅ |
| Docker Compose for local DB (port 5434) | ✅ |
| JWT auth with HttpOnly refresh cookie | ✅ |
| RBAC — 6 roles (ADMIN, MANAGER, CASHIER, VIEWER, ACCOUNTANT, STAFF) | ✅ |
| Seed data (admin user + categories) | ✅ |
| Shared packages: types, ui, i18n, db | ✅ |

---

## ✅ PHASE 2 — Core Business Logic (COMPLETE)

| Module | API | Frontend | Print |
|--------|-----|----------|-------|
| Items / Products (6 prices, barcode, categories) | ✅ | ✅ | — |
| Customers (RETAIL/WHOLESALE, credit limit, balance) | ✅ | ✅ | — |
| Suppliers (balance tracking) | ✅ | ✅ | — |
| Sales Invoices (CASH/CREDIT, 5 price types, dual currency) | ✅ | ✅ | ✅ |
| Purchase Invoices (stock auto-increment) | ✅ | ✅ | ✅ |
| Expenses + Categories | ✅ | ✅ | — |
| Payment Vouchers (Disbursement/Receipt) | ✅ | ✅ | ✅ |
| Stock Transfers (IN/OUT, 5 reason codes) | ✅ | ✅ | — |
| Cash Statement (daily USD+IQD open/close) | ✅ | ✅ | — |
| Settings + Exchange Rate History | ✅ | ✅ | — |

---

## ✅ PHASE 3 — Reports & Analytics (COMPLETE)

| Report | Status |
|--------|--------|
| Sales Report (date range, by customer, by item) | ✅ |
| Purchases Report (date range, by supplier) | ✅ |
| Profit Report (cost vs revenue per item) | ✅ |
| Inventory Report (cost value + retail value) | ✅ |
| Customer Account Statement | ✅ |
| Supplier Account Statement | ✅ |
| PDF Export (jsPDF + autotable) | ✅ |
| Excel Export (exceljs) | ✅ |
| Dashboard KPI cards + Recharts | ✅ |

---

## ✅ PHASE 4 — UI/UX Finalization (COMPLETE)

| Feature | Status |
|---------|--------|
| RTL Arabic layout + i18n keys | ✅ |
| Dark mode (CSS variables) | ✅ |
| Skeleton screens on all loading states | ✅ |
| Page transitions (slide+fade 200ms) | ✅ |
| Mobile sidebar overlay + desktop collapse | ✅ |
| Haptic feedback on nav (Capacitor) | ✅ |
| Barcode scanner — laser overlay + toast | ✅ |
| Virtual scrolling — inventory (VirtualTable) | ✅ |
| Infinite scroll — items list | ✅ |
| WCAG 2.5.5 — 44px touch targets | ✅ |
| Capacitor Android project configured | ✅ |

---

## 🔄 PHASE 5 — Deployment & Networking (IN PROGRESS)

| Task | Status | Notes |
|------|--------|-------|
| Dev server accessible via LAN (0.0.0.0 binding) | ✅ | Both ports 3001 + 4001 |
| Windows Firewall rules (ports 3001, 4001) | ✅ | Created |
| Public IP access configured | ✅ | 212.95.151.51 |
| CORS for public IP + LAN origins | ✅ | All 3 origins allowed |
| Router port forwarding (3001, 4001) | ⏳ | User must configure router |
| Docker production build (web + api images) | ⏳ | Dockerfiles exist |
| Nginx reverse proxy config | ⏳ | nginx.conf exists |
| `.env.production` with real secrets | ⏳ | JWT secrets must be changed |
| SSL/HTTPS (self-signed or Let's Encrypt) | ⏳ | For production LAN |
| `docker compose up` full stack test | ⏳ | |

**To start production stack:**
```bash
cd ims-pro
docker compose up --build -d
```

---

## ⏳ PHASE 6 — Android APK Production Build (PENDING)

| Task | Priority | Notes |
|------|----------|-------|
| Update capacitor.config.ts with production URL | HIGH | Currently dev IP |
| `npx cap sync android` with prod config | HIGH | |
| Generate release keystore | HIGH | Required for signed APK |
| Build signed APK in Android Studio | HIGH | |
| Test APK on real Android device | HIGH | |
| Test barcode scanner on device | HIGH | |
| Test haptic feedback | MEDIUM | |
| Configure Android permissions (camera, vibrate) | HIGH | AndroidManifest.xml |
| App icon + splash screen | MEDIUM | |
| Play Store listing (optional) | LOW | |

**APK build command:**
```bash
cd apps/web
npx cap sync android
npx cap open android   # Then Build → Generate Signed Bundle/APK
```

---

## ⏳ PHASE 7 — Testing & QA (PENDING)

| Task | Priority |
|------|----------|
| API unit tests (Jest + Supertest) | HIGH |
| Auth flow tests (login, refresh, logout, RBAC) | HIGH |
| Invoice creation + stock deduction tests | HIGH |
| Currency conversion accuracy tests | HIGH |
| Frontend component tests (React Testing Library) | MEDIUM |
| E2E tests for POS flow (Playwright) | MEDIUM |
| Mobile layout testing (320px → 1440px) | MEDIUM |
| Cross-browser testing | LOW |
| Load testing (100+ concurrent users) | LOW |

---

## ⏳ PHASE 8 — Advanced Features (PENDING)

### 8A — Barcode & Printing
| Feature | Priority | Notes |
|---------|----------|-------|
| Print barcode labels from item page | HIGH | react-barcode already installed |
| Thermal receipt printer support (ESC/POS) | HIGH | Common in Iraqi market |
| A4 / 80mm receipt print layouts | MEDIUM | jsPDF already installed |
| Bulk barcode label printing | MEDIUM | |

### 8B — Notifications & Alerts
| Feature | Priority | Notes |
|---------|----------|-------|
| Low stock badge on sidebar icon | HIGH | Already detected in inventory |
| Expiry alert banner on dashboard | HIGH | Data already available |
| Push notifications (Capacitor Local Notifications) | MEDIUM | |
| Email alerts for low stock (optional) | LOW | |

### 8C — Customer Experience
| Feature | Priority | Notes |
|---------|----------|-------|
| Customer returns / refunds flow | HIGH | InvoiceStatus.RETURNED exists |
| Credit payment collection (partial payments) | HIGH | balance field exists |
| Customer price-list PDF | MEDIUM | |
| WhatsApp invoice sharing | MEDIUM | Capacitor Share plugin |

### 8D — Purchasing Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Supplier returns flow | HIGH | |
| Purchase order (before invoice) | MEDIUM | |
| Multi-supplier price comparison | LOW | |

### 8E — Dashboard & Analytics
| Feature | Priority | Notes |
|---------|----------|-------|
| Real-time sales chart (today vs yesterday) | HIGH | Recharts ready |
| Top 10 best-selling items widget | HIGH | |
| Profit margin per item chart | MEDIUM | |
| Cash flow timeline chart | MEDIUM | |

### 8F — Data Management
| Feature | Priority | Notes |
|---------|----------|-------|
| CSV/Excel import for items bulk upload | HIGH | exceljs installed |
| Database backup UI (trigger + download) | HIGH | /backups folder mapped |
| Data restore from backup | MEDIUM | |
| Audit log (who changed what) | MEDIUM | |

### 8G — Multi-User & Network
| Feature | Priority | Notes |
|---------|----------|-------|
| Multiple cash registers (multi-device POS) | MEDIUM | Architecture supports it |
| Staff shift management | MEDIUM | |
| Per-user sales report | LOW | |

### 8H — Mobile (Capacitor) Enhancements
| Feature | Priority | Notes |
|---------|----------|-------|
| Offline mode with sync queue | HIGH | Capacitor Storage + queue |
| Camera-based item lookup | HIGH | Scanner exists, needs offline |
| Bluetooth receipt printer | MEDIUM | Capacitor BLE plugin |
| Fingerprint / PIN lock screen | LOW | |

---

## 🐛 KNOWN ISSUES & TECH DEBT

| Issue | Severity | Fix |
|-------|----------|-----|
| Rate limiter resets on API restart (in-memory) | MEDIUM | Use Redis for production |
| `NEXT_PUBLIC_API_URL` baked at build time | MEDIUM | Use runtime config or proxy |
| NAT hairpin — public IP loops back | LOW | Use LAN IP internally |
| sales/new page missing (404) | HIGH | Check `/sales/new/page.tsx` |
| No DB connection pooling config | MEDIUM | Add Prisma connectionLimit |
| JWT secrets are placeholder strings in .env | CRITICAL | Change before production |
| No HTTPS/TLS | HIGH | Add nginx SSL for production |
| `capacitor.config.ts` has dev IP | HIGH | Update before APK build |

---

## 🚀 RECOMMENDED NEXT STEPS (Priority Order)

```
1. 🔴 CRITICAL  → Change JWT_SECRET + JWT_REFRESH_SECRET in .env (security)
2. 🔴 HIGH      → Router port forwarding (3001 + 4001) for external access
3. 🟠 HIGH      → Fix sales/new page if broken
4. 🟠 HIGH      → Print barcode labels from item page
5. 🟠 HIGH      → Low-stock sidebar badge + dashboard alert
6. 🟡 MEDIUM    → Build signed Android APK with production URL
7. 🟡 MEDIUM    → Docker production deployment (docker compose up)
8. 🟡 MEDIUM    → Customer returns / refund flow
9. 🟢 LOW       → API unit tests
10. 🟢 LOW      → Offline mode (Capacitor)
```

---

## 📅 SUGGESTED SPRINT PLAN

### Sprint 1 (1 week) — Security + Printing
- Change JWT secrets
- Barcode label printing
- Low-stock dashboard alerts
- Sales returns flow

### Sprint 2 (1 week) — Mobile + Deployment
- Signed APK production build
- Docker full-stack deploy
- Router port forwarding guide
- Nginx HTTPS config

### Sprint 3 (1 week) — Data + Notifications
- Bulk item import (Excel/CSV)
- Database backup UI
- Expiry push notifications
- Customer partial payment collection

### Sprint 4 (ongoing) — Testing + Polish
- API integration tests
- E2E POS flow tests
- Performance tuning
- Offline mode MVP

---

*IMS-Pro ROADMAP.md v1.0 — 2026-05-23 | Iraqi Market POS + Inventory System*

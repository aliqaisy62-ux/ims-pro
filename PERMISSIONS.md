# IMS-Pro — Permission Model

## Roles

| Role | Description |
|------|-------------|
| **ADMIN** | Full system access. User management, settings, all reports, all operations. |
| **MANAGER** | All business operations except user management and system settings edit. |
| **ACCOUNTANT** | Financial read/write: expenses, vouchers, cash statement, financial reports. No sales creation. |
| **CASHIER** | POS operations: create/view sales, customer lookup, inventory view. |
| **STAFF** | Extended POS: sales, purchases view, customer edit, inventory view. |
| **VIEWER** | Read-only access to all operational data. No creation or editing. |

---

## Permission Matrix

| Permission | ADMIN | MANAGER | ACCOUNTANT | CASHIER | STAFF | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `customers:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `customers:edit` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `inventory:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `inventory:edit` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `sales:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `sales:create` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `sales:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `purchases:view` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `purchases:create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `purchases:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `stock:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `stock:transfer` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `expenses:view` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `expenses:create` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `vouchers:view` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `vouchers:create` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `suppliers:view` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `suppliers:edit` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `reports:view` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `reports:financial` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `cash-statement:view` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `cash-statement:close` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `settings:view` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `settings:edit` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users:view` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `users:manage` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `audit:view` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Endpoint Mapping

### Authentication (`/api/auth`)

| Method | Path | Auth | Permission | Notes |
|--------|------|------|------------|-------|
| POST | `/login` | ❌ | — | Rate-limited: 5 req/15 min |
| POST | `/refresh` | ❌ | — | Cookie-based rotation |
| POST | `/logout` | ❌ | — | Revokes current session |
| POST | `/logout-all` | ✅ | any | Revokes all user sessions |
| GET | `/me` | ✅ | any (incl. restricted) | |
| POST | `/change-password` | ✅ | any (incl. restricted) | Required for forced-reset flow |
| POST | `/users/:userId/revoke-sessions` | ✅ | ADMIN | Force-invalidates another user |

### Inventory / Items (`/api/items`)

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/categories` | authenticated | Needed for all roles (dropdowns) |
| GET | `/barcode/:barcode` | `inventory:view` | |
| GET | `/` | `inventory:view` | |
| GET | `/:id` | `inventory:view` | |
| POST | `/validate-import` | `inventory:edit` | |
| POST | `/import` | `inventory:edit` | Excel only (MIME validated) |
| POST | `/` | `inventory:edit` | |
| PUT | `/:id` | `inventory:edit` | |
| DELETE | `/:id` | ADMIN only | Destructive — hard-guarded |

### Customers (`/api/customers`)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `customers:view` |
| GET | `/:id` | `customers:view` |
| GET | `/:id/statement` | `customers:view` |
| POST | `/` | `customers:edit` |
| PUT | `/:id` | `customers:edit` |
| DELETE | `/:id` | ADMIN only |

### Sales (`/api/sales`)

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/` | `sales:view` | |
| GET | `/:id` | `sales:view` | |
| POST | `/` | `sales:create` | Creates DRAFT |
| POST | `/:id/confirm` | `sales:create` | Confirms draft, deducts stock |
| POST | `/:id/cancel` | `sales:manage` | MANAGER+ |
| POST | `/:id/return` | `sales:manage` | MANAGER+ |
| POST | `/:id/partial-return` | `sales:manage` | MANAGER+ |

### Purchases (`/api/purchases`)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `purchases:view` |
| GET | `/:id` | `purchases:view` |
| POST | `/` | `purchases:create` |
| POST | `/:id/confirm` | `purchases:manage` |
| POST | `/:id/cancel` | `purchases:manage` |

### Stock (`/api/stock`)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/transfers` | `stock:view` |
| GET | `/inventory` | `stock:view` |
| GET | `/low-stock` | `stock:view` |
| GET | `/expiring` | `stock:view` |
| POST | `/transfer` | `stock:transfer` |

### Expenses (`/api/expenses`, `/api/expense-categories`)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `expenses:view` |
| GET | `/:id` | `expenses:view` |
| GET | `/summary` | `expenses:view` |
| POST | `/` | `expenses:create` |
| PUT | `/:id` | `expenses:create` |
| DELETE | `/:id` | ADMIN only |

### Vouchers (`/api/vouchers`)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `vouchers:view` |
| GET | `/:id` | `vouchers:view` |
| POST | `/` | `vouchers:create` |

### Suppliers (`/api/suppliers`)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `suppliers:view` |
| GET | `/:id` | `suppliers:view` |
| GET | `/:id/statement` | `suppliers:view` |
| POST | `/` | `suppliers:edit` |
| PUT | `/:id` | `suppliers:edit` |
| DELETE | `/:id` | ADMIN only |

### Reports (`/api/reports`)

| Method | Path | Permission | Business Justification |
|--------|------|------------|------------------------|
| GET | `/today-summary` | `sales:view` or `inventory:view` | Dashboard KPIs |
| GET | `/sales` | `reports:view` | |
| GET | `/purchases` | `reports:view` | |
| GET | `/inventory` | `reports:view` | |
| GET | `/customer-statement/:id` | `reports:view` | |
| GET | `/supplier-statement/:id` | `reports:view` | |
| GET | `/top-sellers` | `reports:view` | |
| GET | `/peak-hours` | `reports:view` | |
| GET | `/profit` | `reports:financial` | **Restricted** — contains margin data. VIEWER excluded. |

### Cash Statement (`/api/cash-statement`)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/today` | `cash-statement:view` |
| GET | `/range` | `cash-statement:view` |
| GET | `/` | `cash-statement:view` |
| POST | `/close` | `cash-statement:close` |

### Settings (`/api/settings`)

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/` | `settings:view` | |
| PUT | `/` | `settings:edit` | ADMIN only |
| POST | `/exchange-rate` | `settings:edit` | ADMIN only |
| GET | `/exchange-rate/history` | `settings:view` | |
| GET | `/users` | `users:view` | ADMIN + MANAGER |
| POST | `/users` | `users:manage` | ADMIN only |
| PUT | `/users/:id` | `users:manage` | ADMIN only |
| POST | `/users/:id/reset-password` | ADMIN only | Sets mustChangePassword=true, revokes sessions |

---

## Session Security Model

### Refresh Token Rotation
- Every refresh issues a **new** token and revokes the old one.
- All tokens in a rotation chain share a `familyId`.
- Revoked tokens remain in the database for audit purposes.

### Reuse Detection
When a **revoked** refresh token is presented:
1. The entire token **family** is immediately revoked.
2. The user is forced to re-authenticate.
3. A `REFRESH_REUSE_DETECTED` audit event is logged with userId, familyId, and IP.

### Token Versioning
- Every `User` has a `tokenVersion` field (integer, starts at 0).
- `tokenVersion` is included in every access token payload.
- On every request, the middleware reads `tokenVersion` from the DB and compares it to the token payload.
- When to increment `tokenVersion`:
  - User changes their password
  - Admin resets a user's password
  - Admin force-revokes a user's sessions
  - Account is disabled

### mustChangePassword Flow
1. Admin sets `mustChangePassword = true` on a user.
2. On next login, the user receives a **restricted** access token.
3. Restricted tokens can only access `GET /auth/me` and `POST /auth/change-password`.
4. All other endpoints return `403 PASSWORD_CHANGE_REQUIRED`.
5. After a successful password change, `mustChangePassword` is cleared, `tokenVersion` is incremented, and all sessions are revoked.

### Account Lockout
- After **5** consecutive failed logins, the account is locked for **15 minutes**.
- Configurable via `LOCKOUT_MAX_ATTEMPTS` and `LOCKOUT_DURATION_MINUTES` env vars.
- Successful login resets the counter.
- Lockout events are written to the audit log.

---

## Audit Events

| Event | Trigger |
|-------|---------|
| `LOGIN_SUCCESS` | Successful login |
| `LOGIN_FAILED` | Failed login attempt |
| `ACCOUNT_LOCKED` | Account locked after N failed attempts |
| `LOGOUT` | Single-device logout |
| `LOGOUT_ALL` | All-device logout |
| `REFRESH_REUSE_DETECTED` | Revoked refresh token presented |
| `PASSWORD_CHANGED` | Password changed by user |
| `PASSWORD_CHANGE_FAILED` | Incorrect current password on voluntary change |
| `ADMIN_SESSION_REVOKE` | Admin force-revoked another user's sessions |

---

## Electron Desktop Security

### DevTools
- DevTools are **disabled in production** builds (`app.isPackaged === true`).
- The `devtools-opened` event is intercepted and immediately closes DevTools.
- The Ctrl+Shift+I shortcut is only registered in development.

### Privilege Level
- `requestedExecutionLevel: "asInvoker"` — the application runs with **user-level privileges**.
- The NSIS installer uses UAC elevation internally (because `perMachine: true` installs to Program Files), but the installed application itself does not require administrator rights at runtime.
- **Justification for not using `requireAdministrator`**: The app only reads/writes to `%APPDATA%\IMS-Pro` (userData path) and spawns child processes on loopback ports. No system-level operations require elevated privileges at runtime.

### Code Signing (Production Requirement)
Windows production builds **must** be Authenticode signed before distribution.

```
signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a IMS-Pro.exe
```

An unsigned installer will trigger SmartScreen warnings and may be blocked by enterprise group policy. Unsigned builds are **not supported for production deployment**.

For automated CI signing, use the `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` environment variables supported by electron-builder.

---

*Last updated: 2026-05-30 | IMS-Pro v1.0*

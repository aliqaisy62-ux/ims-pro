-- ============================================================
-- IMS-Pro — Full Schema + Seed for Supabase SQL Editor
-- Paste this entire file into: Supabase → SQL Editor → Run
-- ============================================================

-- ─── SCHEMA ──────────────────────────────────────────────────

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CASHIER',
    "language" TEXT NOT NULL DEFAULT 'ar',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IQD',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Item" (
    "id" TEXT NOT NULL,
    "barcode" TEXT,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "categoryId" TEXT,
    "costPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "retailPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "wholesalePrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "specialPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "dollarPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "dinarPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "stockQty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "minimumStock" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3),
    "supplierId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "type" TEXT NOT NULL DEFAULT 'RETAIL',
    "creditLimit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IQD',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SalesInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'CASH',
    "priceType" TEXT NOT NULL DEFAULT 'RETAIL',
    "currency" TEXT NOT NULL DEFAULT 'IQD',
    "exchangeRate" DECIMAL(65,30) NOT NULL DEFAULT 1480,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SalesInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IQD',
    "subtotal" DECIMAL(65,30) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    CONSTRAINT "SalesInvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PurchaseInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IQD',
    "exchangeRate" DECIMAL(65,30) NOT NULL DEFAULT 1480,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PurchaseInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IQD',
    "subtotal" DECIMAL(65,30) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    CONSTRAINT "PurchaseInvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IQD',
    "exchangeRate" DECIMAL(65,30) NOT NULL DEFAULT 1480,
    "paidBy" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StockTransfer" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentVoucher" (
    "id" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'OTHER',
    "entityId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IQD',
    "exchangeRate" DECIMAL(65,30) NOT NULL DEFAULT 1480,
    "description" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentVoucher_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CashStatement" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "openingBalanceUSD" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "openingBalanceIQD" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cashSalesUSD" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cashSalesIQD" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "creditSales" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "receipts" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "disbursements" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "expenses" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "closingBalanceUSD" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "closingBalanceIQD" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashStatement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExchangeRateHistory" (
    "id" TEXT NOT NULL,
    "rateIQD" DECIMAL(65,30) NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExchangeRateHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- ─── INDEXES ──────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");
CREATE INDEX IF NOT EXISTS "Category_name_ar_idx" ON "Category"("name_ar");
CREATE INDEX IF NOT EXISTS "Supplier_name_idx" ON "Supplier"("name");
CREATE INDEX IF NOT EXISTS "Supplier_isActive_idx" ON "Supplier"("isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "Item_barcode_key" ON "Item"("barcode");
CREATE INDEX IF NOT EXISTS "Item_barcode_idx" ON "Item"("barcode");
CREATE INDEX IF NOT EXISTS "Item_categoryId_idx" ON "Item"("categoryId");
CREATE INDEX IF NOT EXISTS "Item_supplierId_idx" ON "Item"("supplierId");
CREATE INDEX IF NOT EXISTS "Item_isActive_idx" ON "Item"("isActive");
CREATE INDEX IF NOT EXISTS "Item_stockQty_idx" ON "Item"("stockQty");
CREATE INDEX IF NOT EXISTS "Item_expiryDate_idx" ON "Item"("expiryDate");
CREATE INDEX IF NOT EXISTS "Customer_name_idx" ON "Customer"("name");
CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX IF NOT EXISTS "Customer_isActive_idx" ON "Customer"("isActive");
CREATE INDEX IF NOT EXISTS "Customer_type_idx" ON "Customer"("type");
CREATE UNIQUE INDEX IF NOT EXISTS "SalesInvoice_invoiceNumber_key" ON "SalesInvoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "SalesInvoice_invoiceNumber_idx" ON "SalesInvoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "SalesInvoice_customerId_idx" ON "SalesInvoice"("customerId");
CREATE INDEX IF NOT EXISTS "SalesInvoice_createdById_idx" ON "SalesInvoice"("createdById");
CREATE INDEX IF NOT EXISTS "SalesInvoice_status_idx" ON "SalesInvoice"("status");
CREATE INDEX IF NOT EXISTS "SalesInvoice_createdAt_idx" ON "SalesInvoice"("createdAt");
CREATE INDEX IF NOT EXISTS "SalesInvoice_type_idx" ON "SalesInvoice"("type");
CREATE INDEX IF NOT EXISTS "SalesInvoiceItem_invoiceId_idx" ON "SalesInvoiceItem"("invoiceId");
CREATE INDEX IF NOT EXISTS "SalesInvoiceItem_itemId_idx" ON "SalesInvoiceItem"("itemId");
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseInvoice_invoiceNumber_key" ON "PurchaseInvoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "PurchaseInvoice_invoiceNumber_idx" ON "PurchaseInvoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "PurchaseInvoice_supplierId_idx" ON "PurchaseInvoice"("supplierId");
CREATE INDEX IF NOT EXISTS "PurchaseInvoice_createdById_idx" ON "PurchaseInvoice"("createdById");
CREATE INDEX IF NOT EXISTS "PurchaseInvoice_status_idx" ON "PurchaseInvoice"("status");
CREATE INDEX IF NOT EXISTS "PurchaseInvoice_createdAt_idx" ON "PurchaseInvoice"("createdAt");
CREATE INDEX IF NOT EXISTS "PurchaseInvoiceItem_invoiceId_idx" ON "PurchaseInvoiceItem"("invoiceId");
CREATE INDEX IF NOT EXISTS "PurchaseInvoiceItem_itemId_idx" ON "PurchaseInvoiceItem"("itemId");
CREATE INDEX IF NOT EXISTS "ExpenseCategory_name_ar_idx" ON "ExpenseCategory"("name_ar");
CREATE INDEX IF NOT EXISTS "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date");
CREATE INDEX IF NOT EXISTS "Expense_createdById_idx" ON "Expense"("createdById");
CREATE INDEX IF NOT EXISTS "Expense_isActive_idx" ON "Expense"("isActive");
CREATE INDEX IF NOT EXISTS "StockTransfer_itemId_idx" ON "StockTransfer"("itemId");
CREATE INDEX IF NOT EXISTS "StockTransfer_createdById_idx" ON "StockTransfer"("createdById");
CREATE INDEX IF NOT EXISTS "StockTransfer_createdAt_idx" ON "StockTransfer"("createdAt");
CREATE INDEX IF NOT EXISTS "StockTransfer_type_idx" ON "StockTransfer"("type");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentVoucher_voucherNumber_key" ON "PaymentVoucher"("voucherNumber");
CREATE INDEX IF NOT EXISTS "PaymentVoucher_voucherNumber_idx" ON "PaymentVoucher"("voucherNumber");
CREATE INDEX IF NOT EXISTS "PaymentVoucher_type_idx" ON "PaymentVoucher"("type");
CREATE INDEX IF NOT EXISTS "PaymentVoucher_entityType_idx" ON "PaymentVoucher"("entityType");
CREATE INDEX IF NOT EXISTS "PaymentVoucher_entityId_idx" ON "PaymentVoucher"("entityId");
CREATE INDEX IF NOT EXISTS "PaymentVoucher_createdAt_idx" ON "PaymentVoucher"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "CashStatement_date_key" ON "CashStatement"("date");
CREATE INDEX IF NOT EXISTS "CashStatement_date_idx" ON "CashStatement"("date");
CREATE INDEX IF NOT EXISTS "CashStatement_isClosed_idx" ON "CashStatement"("isClosed");
CREATE INDEX IF NOT EXISTS "ExchangeRateHistory_createdAt_idx" ON "ExchangeRateHistory"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Settings_key_key" ON "Settings"("key");
CREATE INDEX IF NOT EXISTS "Settings_key_idx" ON "Settings"("key");

-- ─── FOREIGN KEYS ─────────────────────────────────────────────
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesInvoiceItem" ADD CONSTRAINT "SalesInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesInvoiceItem" ADD CONSTRAINT "SalesInvoiceItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeRateHistory" ADD CONSTRAINT "ExchangeRateHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── SEED DATA ────────────────────────────────────────────────

-- Users are NOT seeded via this SQL file.
-- User accounts (including the initial admin) are created through the application
-- setup workflow using environment-variable-driven seed scripts.
--
-- To create the initial admin user, run:
--   SEED_ADMIN_USERNAME=admin SEED_ADMIN_PASSWORD=<strong-password> npm run db:seed
--
-- Never commit user rows or password hashes to version control.

-- Item Categories
INSERT INTO "Category" ("id", "name_ar", "name_en") VALUES
  ('cat-electronics',     'إلكترونيات',    'Electronics'),
  ('cat-food-&-groceries','مواد غذائية',   'Food & Groceries'),
  ('cat-clothing',        'ملابس',          'Clothing'),
  ('cat-household',       'منزلية',         'Household'),
  ('cat-personal-care',   'عناية شخصية',   'Personal Care'),
  ('cat-other',           'أخرى',           'Other')
ON CONFLICT ("id") DO NOTHING;

-- Expense Categories
INSERT INTO "ExpenseCategory" ("id", "name_ar", "name_en") VALUES
  ('expcat-rent',       'إيجار',  'Rent'),
  ('expcat-utilities',  'خدمات',  'Utilities'),
  ('expcat-salaries',   'رواتب',  'Salaries'),
  ('expcat-transport',  'نقل',    'Transport'),
  ('expcat-other',      'أخرى',   'Other')
ON CONFLICT ("id") DO NOTHING;

-- Settings
INSERT INTO "Settings" ("id", "key", "value", "description", "updatedAt") VALUES
  ('set-01', 'exchange_rate',        '1480',         'IQD per 1 USD',                    NOW()),
  ('set-02', 'business_name_ar',     'اسم المنشأة',  'Business name in Arabic',          NOW()),
  ('set-03', 'business_name_en',     'Business Name','Business name in English',          NOW()),
  ('set-04', 'business_address',     '',             'Business address',                  NOW()),
  ('set-05', 'business_phone',       '',             'Business phone number',             NOW()),
  ('set-06', 'default_currency',     'IQD',          'Default currency (USD or IQD)',     NOW()),
  ('set-07', 'default_price_type',   'RETAIL',       'Default price type for sales',     NOW()),
  ('set-08', 'default_language',     'ar',           'Default UI language',              NOW()),
  ('set-09', 'tax_rate',             '0',            'Tax rate percentage',              NOW()),
  ('set-10', 'invoice_footer_ar',    '',             'Invoice footer text in Arabic',    NOW()),
  ('set-11', 'invoice_footer_en',    '',             'Invoice footer text in English',   NOW()),
  ('set-12', 'minimum_stock_alert',  'true',         'Enable minimum stock alerts',      NOW()),
  ('set-13', 'paper_width',          '80',           'Receipt printer paper width (mm)', NOW())
ON CONFLICT ("key") DO NOTHING;

-- Exchange rate history is seeded by the application seed script after the admin
-- user is created. It requires a valid changedById FK — see packages/db/prisma/seed.ts.

-- ─── Prisma migrations tracking (so prisma doesn't re-run this) ──
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    VARCHAR(36)  NOT NULL PRIMARY KEY,
    "checksum"              VARCHAR(64)  NOT NULL,
    "finished_at"           TIMESTAMPTZ,
    "migration_name"        VARCHAR(255) NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        TIMESTAMPTZ,
    "started_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "applied_steps_count"   INTEGER      NOT NULL DEFAULT 0
);

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
VALUES (
  gen_random_uuid()::text,
  'manual-seed-via-sql-editor',
  NOW(),
  '20260527000000_postgres_init',
  1
) ON CONFLICT DO NOTHING;

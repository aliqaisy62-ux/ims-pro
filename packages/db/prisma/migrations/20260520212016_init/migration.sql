-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'CASHIER', 'VIEWER');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ar', 'en');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('RETAIL', 'WHOLESALE', 'SPECIAL', 'DOLLAR', 'DINAR');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'CREDIT');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'IQD');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RETAIL', 'WHOLESALE');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('DISBURSEMENT', 'RECEIPT');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'OTHER');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "TransferReason" AS ENUM ('DAMAGE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CASHIER',
    "language" "Language" NOT NULL DEFAULT 'ar',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "balance" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'IQD',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "barcode" TEXT,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "categoryId" TEXT,
    "costPrice" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "retailPrice" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "wholesalePrice" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "specialPrice" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "dollarPrice" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "dinarPrice" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "stockQty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "minimumStock" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3),
    "supplierId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "type" "CustomerType" NOT NULL DEFAULT 'RETAIL',
    "creditLimit" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'IQD',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "type" "PaymentType" NOT NULL DEFAULT 'CASH',
    "priceType" "PriceType" NOT NULL DEFAULT 'RETAIL',
    "currency" "Currency" NOT NULL DEFAULT 'IQD',
    "exchangeRate" DECIMAL(15,3) NOT NULL DEFAULT 1480,
    "subtotal" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "tax" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unitPrice" DECIMAL(15,3) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'IQD',
    "subtotal" DECIMAL(15,3) NOT NULL,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "SalesInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'IQD',
    "exchangeRate" DECIMAL(15,3) NOT NULL DEFAULT 1480,
    "subtotal" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unitCost" DECIMAL(15,3) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'IQD',
    "subtotal" DECIMAL(15,3) NOT NULL,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "PurchaseInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,3) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'IQD',
    "paidBy" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "type" "TransferType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "reason" "TransferReason" NOT NULL,
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentVoucher" (
    "id" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "type" "VoucherType" NOT NULL,
    "entityType" "EntityType" NOT NULL DEFAULT 'OTHER',
    "entityId" TEXT,
    "amount" DECIMAL(15,3) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'IQD',
    "exchangeRate" DECIMAL(15,3) NOT NULL DEFAULT 1480,
    "description" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashStatement" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "openingBalanceUSD" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "openingBalanceIQD" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "cashSalesUSD" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "cashSalesIQD" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "creditSales" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "receipts" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "disbursements" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "expenses" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "closingBalanceUSD" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "closingBalanceIQD" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRateHistory" (
    "id" TEXT NOT NULL,
    "rateIQD" DECIMAL(15,3) NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "Category_name_ar_idx" ON "Category"("name_ar");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Supplier_isActive_idx" ON "Supplier"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Item_barcode_key" ON "Item"("barcode");

-- CreateIndex
CREATE INDEX "Item_barcode_idx" ON "Item"("barcode");

-- CreateIndex
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");

-- CreateIndex
CREATE INDEX "Item_supplierId_idx" ON "Item"("supplierId");

-- CreateIndex
CREATE INDEX "Item_isActive_idx" ON "Item"("isActive");

-- CreateIndex
CREATE INDEX "Item_stockQty_idx" ON "Item"("stockQty");

-- CreateIndex
CREATE INDEX "Item_expiryDate_idx" ON "Item"("expiryDate");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_isActive_idx" ON "Customer"("isActive");

-- CreateIndex
CREATE INDEX "Customer_type_idx" ON "Customer"("type");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_invoiceNumber_key" ON "SalesInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "SalesInvoice_invoiceNumber_idx" ON "SalesInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "SalesInvoice_customerId_idx" ON "SalesInvoice"("customerId");

-- CreateIndex
CREATE INDEX "SalesInvoice_createdById_idx" ON "SalesInvoice"("createdById");

-- CreateIndex
CREATE INDEX "SalesInvoice_status_idx" ON "SalesInvoice"("status");

-- CreateIndex
CREATE INDEX "SalesInvoice_createdAt_idx" ON "SalesInvoice"("createdAt");

-- CreateIndex
CREATE INDEX "SalesInvoice_type_idx" ON "SalesInvoice"("type");

-- CreateIndex
CREATE INDEX "SalesInvoiceItem_invoiceId_idx" ON "SalesInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "SalesInvoiceItem_itemId_idx" ON "SalesInvoiceItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_invoiceNumber_key" ON "PurchaseInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_invoiceNumber_idx" ON "PurchaseInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_supplierId_idx" ON "PurchaseInvoice"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_createdById_idx" ON "PurchaseInvoice"("createdById");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_status_idx" ON "PurchaseInvoice"("status");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_createdAt_idx" ON "PurchaseInvoice"("createdAt");

-- CreateIndex
CREATE INDEX "PurchaseInvoiceItem_invoiceId_idx" ON "PurchaseInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "PurchaseInvoiceItem_itemId_idx" ON "PurchaseInvoiceItem"("itemId");

-- CreateIndex
CREATE INDEX "ExpenseCategory_name_ar_idx" ON "ExpenseCategory"("name_ar");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_createdById_idx" ON "Expense"("createdById");

-- CreateIndex
CREATE INDEX "Expense_isActive_idx" ON "Expense"("isActive");

-- CreateIndex
CREATE INDEX "StockTransfer_itemId_idx" ON "StockTransfer"("itemId");

-- CreateIndex
CREATE INDEX "StockTransfer_createdById_idx" ON "StockTransfer"("createdById");

-- CreateIndex
CREATE INDEX "StockTransfer_createdAt_idx" ON "StockTransfer"("createdAt");

-- CreateIndex
CREATE INDEX "StockTransfer_type_idx" ON "StockTransfer"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentVoucher_voucherNumber_key" ON "PaymentVoucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "PaymentVoucher_voucherNumber_idx" ON "PaymentVoucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "PaymentVoucher_type_idx" ON "PaymentVoucher"("type");

-- CreateIndex
CREATE INDEX "PaymentVoucher_entityType_idx" ON "PaymentVoucher"("entityType");

-- CreateIndex
CREATE INDEX "PaymentVoucher_entityId_idx" ON "PaymentVoucher"("entityId");

-- CreateIndex
CREATE INDEX "PaymentVoucher_createdAt_idx" ON "PaymentVoucher"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashStatement_date_key" ON "CashStatement"("date");

-- CreateIndex
CREATE INDEX "CashStatement_date_idx" ON "CashStatement"("date");

-- CreateIndex
CREATE INDEX "CashStatement_isClosed_idx" ON "CashStatement"("isClosed");

-- CreateIndex
CREATE INDEX "ExchangeRateHistory_createdAt_idx" ON "ExchangeRateHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- CreateIndex
CREATE INDEX "Settings_key_idx" ON "Settings"("key");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceItem" ADD CONSTRAINT "SalesInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceItem" ADD CONSTRAINT "SalesInvoiceItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRateHistory" ADD CONSTRAINT "ExchangeRateHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

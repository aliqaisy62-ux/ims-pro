-- AddColumn: returnedQty to SalesInvoiceItem for cumulative partial-return tracking
ALTER TABLE "SalesInvoiceItem" ADD COLUMN "returnedQty" DECIMAL(65,30) NOT NULL DEFAULT 0;

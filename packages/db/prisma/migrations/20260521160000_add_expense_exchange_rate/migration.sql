-- AlterTable: add exchangeRate to Expense with default 1480 (IQD per USD)
ALTER TABLE "Expense" ADD COLUMN "exchangeRate" DECIMAL(15,3) NOT NULL DEFAULT 1480;

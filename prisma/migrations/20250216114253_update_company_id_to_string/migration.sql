-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "invoiceNumber" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "InvoiceLine" ALTER COLUMN "lineID" SET DATA TYPE TEXT,
ALTER COLUMN "invoicedQuantityUnitCode" SET DATA TYPE TEXT,
ALTER COLUMN "buyersItemID" SET DATA TYPE TEXT,
ALTER COLUMN "standardItemID" SET DATA TYPE TEXT,
ALTER COLUMN "standardItemSchemeID" SET DATA TYPE TEXT,
ALTER COLUMN "standardItemSchemeName" SET DATA TYPE TEXT,
ALTER COLUMN "taxTotalAmountCurrencyID" SET DATA TYPE TEXT,
ALTER COLUMN "taxableAmountCurrencyID" SET DATA TYPE TEXT,
ALTER COLUMN "taxSchemeID" SET DATA TYPE TEXT,
ALTER COLUMN "taxSchemeName" SET DATA TYPE TEXT,
ALTER COLUMN "priceAmountCurrencyID" SET DATA TYPE TEXT,
ALTER COLUMN "allowanceChargeID" SET DATA TYPE TEXT,
ALTER COLUMN "allowanceChargeAmountCurrency" SET DATA TYPE TEXT,
ALTER COLUMN "withholdingTaxTotalAmountCurrency" SET DATA TYPE TEXT,
ALTER COLUMN "withholdingTaxSchemeID" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "companyId" UUID,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- RenameForeignKey
ALTER TABLE "Invoice" RENAME CONSTRAINT "invoice_companyId_fkey" TO "Invoice_companyId_fkey";

-- RenameForeignKey
ALTER TABLE "Invoice" RENAME CONSTRAINT "invoice_thirdPartyId_fkey" TO "Invoice_thirdPartyId_fkey";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "additionalAccountID" TEXT,
    "industryClassificationCode" TEXT,
    "physicalLocationID" TEXT,
    "countrySubentityCode" TEXT,
    "line" TEXT,
    "registrationName" TEXT,
    "taxLevelCode" TEXT,
    "taxSchemeID" TEXT,
    "taxSchemeName" TEXT,
    "companyID" TEXT,
    "companyIDSchemeID" TEXT,
    "companyIDSchemeName" TEXT,
    "companyIDSchemeAgencyID" TEXT,
    "contactName" TEXT,
    "contactTelephone" TEXT,
    "contactTelefax" TEXT,
    "contactElectronicMail" TEXT,
    "contactNote" TEXT,
    "registrationAddressID" TEXT,
    "nit" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);
-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SENT', 'RECEIVED');

-- CreateTable
CREATE TABLE "Invoice" (
    "uuid" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" VARCHAR(255) NOT NULL,
    "companyId" UUID NOT NULL,
    "thirdPartyId" UUID NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "issueDate" DATE NOT NULL,
    "issueTime" TIME NOT NULL,
    "dueDate" DATE NOT NULL,
    "invoiceTypeCode" TEXT,
    "note" TEXT,
    "documentCurrencyCode" CHAR(3),
    "invoiceAllowanceChargeMultiplierFactorNumeric" DECIMAL(10,2),
    "invoiceAllowanceChargeAmount" DECIMAL(15,2),
    "invoiceAllowanceChargeAmountCurrencyID" CHAR(3),
    "invoiceAllowanceChargeBaseAmount" DECIMAL(15,2),
    "invoiceAllowanceChargeBaseAmountCurrencyID" CHAR(3),
    "invoiceTaxTotalTaxAmount" DECIMAL(15,2),
    "invoiceTaxTotalTaxAmountCurrencyID" CHAR(3),
    "invoiceWithholdingTaxTotalTaxAmount" DECIMAL(15,2),
    "invoiceWithholdingTaxTotalTaxAmountCurrencyID" CHAR(3),
    "invoiceLineExtensionAmount" DECIMAL(15,2),
    "invoiceTaxExclusiveAmount" DECIMAL(15,2),
    "invoiceTaxInclusiveAmount" DECIMAL(15,2),
    "invoiceAllowanceTotalAmount" DECIMAL(15,2),
    "invoiceChargeTotalAmount" DECIMAL(15,2),
    "invoicePayableAmount" DECIMAL(15,2),
    CONSTRAINT "invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoice_thirdPartyId_fkey" FOREIGN KEY ("thirdPartyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE
); 

-- CreateTable
CREATE TABLE "SoftwareProvider" (
    "id" UUID PRIMARY KEY,
    "nit" TEXT NOT NULL UNIQUE
); 

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" UUID NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "lineID" VARCHAR(255),
    "itemDescription" TEXT,
    "quantity" DECIMAL(10,2),
    "note" TEXT,
    "invoicedQuantityUnitCode" VARCHAR(255),
    "lineExtensionAmount" DECIMAL(10,2),
    "buyersItemID" VARCHAR(255),
    "standardItemID" VARCHAR(255),
    "standardItemSchemeID" VARCHAR(255),
    "standardItemSchemeName" VARCHAR(255),
    "taxTotalAmount" DECIMAL(10,2),
    "taxTotalAmountCurrencyID" VARCHAR(255),
    "taxableAmount" DECIMAL(10,2),
    "taxableAmountCurrencyID" VARCHAR(255),
    "taxSchemeID" VARCHAR(255),
    "taxSchemeName" VARCHAR(255),
    "priceAmount" DECIMAL(10,2),
    "priceAmountCurrencyID" VARCHAR(255),
    "allowanceChargeID" VARCHAR(255),
    "allowanceChargeIndicator" BOOLEAN,
    "allowanceChargeMultiplierFactorNumeric" DECIMAL(10,2),
    "allowanceChargeAmount" DECIMAL(10,2),
    "allowanceChargeAmountCurrency" VARCHAR(255),
    "allowanceChargeBaseAmount" DECIMAL(10,2),
    "withholdingTaxTotalAmount" DECIMAL(10,2),
    "withholdingTaxTotalAmountCurrency" VARCHAR(255),
    "withholdingTaxableAmount" DECIMAL(10,2),
    "withholdingTaxPercent" DECIMAL(10,2),
    "withholdingTaxSchemeID" VARCHAR(255),

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
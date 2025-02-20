import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1710000000000 implements MigrationInterface {
  name = 'CreateInitialTables1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "company" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "additionalAccountID" VARCHAR,
                "industryClassificationCode" VARCHAR,
                "physicalLocationID" VARCHAR,
                "countrySubentityCode" VARCHAR,
                "line" VARCHAR,
                "registrationName" VARCHAR,
                "taxLevelCode" VARCHAR,
                "taxSchemeID" VARCHAR,
                "taxSchemeName" VARCHAR,
                "companyID" VARCHAR,
                "companyIDSchemeID" VARCHAR,
                "companyIDSchemeName" VARCHAR,
                "companyIDSchemeAgencyID" VARCHAR,
                "contactName" VARCHAR,
                "contactTelephone" VARCHAR,
                "contactTelefax" VARCHAR,
                "contactElectronicMail" VARCHAR,
                "contactNote" TEXT,
                "registrationAddressID" VARCHAR,
                "nit" VARCHAR UNIQUE NOT NULL,
                "name" VARCHAR NOT NULL
            );

            CREATE TABLE "invoice" (
                "uuid" TEXT PRIMARY KEY,
                "invoiceNumber" VARCHAR NOT NULL,
                "companyId" UUID NOT NULL,
                "thirdPartyId" UUID NOT NULL,
                "type" VARCHAR NOT NULL,
                "issueDate" DATE NOT NULL,
                "issueTime" TIME NOT NULL,
                "dueDate" DATE NOT NULL,
                "invoiceTypeCode" VARCHAR,
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
                FOREIGN KEY ("companyId") REFERENCES "company" ("id"),
                FOREIGN KEY ("thirdPartyId") REFERENCES "company" ("id")
            );

            CREATE TABLE "invoice_line" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "invoiceId" TEXT NOT NULL,
                "lineID" VARCHAR,
                "itemDescription" TEXT,
                "quantity" DECIMAL(10,2),
                "note" TEXT,
                "invoicedQuantityUnitCode" VARCHAR,
                "lineExtensionAmount" DECIMAL(10,2),
                "buyersItemID" VARCHAR,
                "standardItemID" VARCHAR,
                "standardItemSchemeID" VARCHAR,
                "standardItemSchemeName" VARCHAR,
                "taxTotalAmount" DECIMAL(10,2),
                "taxTotalAmountCurrencyID" VARCHAR,
                "taxableAmount" DECIMAL(10,2),
                "taxableAmountCurrencyID" VARCHAR,
                "taxSchemeID" VARCHAR,
                "taxSchemeName" VARCHAR,
                "priceAmount" DECIMAL(10,2),
                "priceAmountCurrencyID" VARCHAR,
                "allowanceChargeID" VARCHAR,
                "allowanceChargeIndicator" BOOLEAN,
                "allowanceChargeMultiplierFactorNumeric" DECIMAL(10,2),
                "allowanceChargeAmount" DECIMAL(10,2),
                "allowanceChargeAmountCurrency" VARCHAR,
                "allowanceChargeBaseAmount" DECIMAL(10,2),
                "withholdingTaxTotalAmount" DECIMAL(10,2),
                "withholdingTaxTotalAmountCurrency" VARCHAR,
                "withholdingTaxableAmount" DECIMAL(10,2),
                "withholdingTaxPercent" DECIMAL(10,2),
                "withholdingTaxSchemeID" VARCHAR,
                FOREIGN KEY ("invoiceId") REFERENCES "invoice" ("uuid") ON DELETE CASCADE
            );

            CREATE TABLE "software_provider" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "nit" VARCHAR UNIQUE NOT NULL
            );

            CREATE TABLE "user" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR NOT NULL,
                "email" VARCHAR UNIQUE NOT NULL,
                "password" VARCHAR NOT NULL
            );

            CREATE TABLE "user_companies_company" (
                "userId" INTEGER NOT NULL,
                "companyId" UUID NOT NULL,
                PRIMARY KEY ("userId", "companyId"),
                FOREIGN KEY ("userId") REFERENCES "user" ("id"),
                FOREIGN KEY ("companyId") REFERENCES "company" ("id")
            );
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "user_companies_company";
            DROP TABLE "user";
            DROP TABLE "software_provider";
            DROP TABLE "invoice_line";
            DROP TABLE "invoice";
            DROP TABLE "company";
        `);
  }
}

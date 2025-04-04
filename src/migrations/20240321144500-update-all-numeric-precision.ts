import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAllNumericPrecision20240321144500
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update Invoice table columns
    await queryRunner.query(`
            ALTER TABLE "invoice" 
            ALTER COLUMN "invoiceAllowanceChargeMultiplierFactorNumeric" TYPE numeric(20,6),
            ALTER COLUMN "invoiceAllowanceChargeAmount" TYPE numeric(20,6),
            ALTER COLUMN "invoiceAllowanceChargeBaseAmount" TYPE numeric(20,6),
            ALTER COLUMN "invoiceTaxTotalTaxAmount" TYPE numeric(20,6),
            ALTER COLUMN "invoiceWithholdingTaxTotalTaxAmount" TYPE numeric(20,6),
            ALTER COLUMN "invoiceLineExtensionAmount" TYPE numeric(20,6),
            ALTER COLUMN "invoiceTaxExclusiveAmount" TYPE numeric(20,6),
            ALTER COLUMN "invoiceTaxInclusiveAmount" TYPE numeric(20,6),
            ALTER COLUMN "invoiceAllowanceTotalAmount" TYPE numeric(20,6),
            ALTER COLUMN "invoiceChargeTotalAmount" TYPE numeric(20,6),
            ALTER COLUMN "invoicePayableAmount" TYPE numeric(20,6);
        `);

    // Update Invoice Line table columns
    await queryRunner.query(`
            ALTER TABLE "invoice_line" 
            ALTER COLUMN "quantity" TYPE numeric(20,6),
            ALTER COLUMN "lineExtensionAmount" TYPE numeric(20,6),
            ALTER COLUMN "allowanceChargeMultiplierFactorNumeric" TYPE numeric(20,6),
            ALTER COLUMN "allowanceChargeAmount" TYPE numeric(20,6),
            ALTER COLUMN "allowanceChargeBaseAmount" TYPE numeric(20,6),
            ALTER COLUMN "withholdingTaxTotalAmount" TYPE numeric(20,6),
            ALTER COLUMN "withholdingTaxPercent" TYPE numeric(20,6),
            ALTER COLUMN "withholdingTaxableAmount" TYPE numeric(20,6),
            ALTER COLUMN "taxTotalAmount" TYPE numeric(20,6),
            ALTER COLUMN "taxableAmount" TYPE numeric(20,6),
            ALTER COLUMN "priceAmount" TYPE numeric(20,6);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert Invoice table columns
    await queryRunner.query(`
            ALTER TABLE "invoice" 
            ALTER COLUMN "invoiceAllowanceChargeMultiplierFactorNumeric" TYPE numeric(10,2),
            ALTER COLUMN "invoiceAllowanceChargeAmount" TYPE numeric(10,2),
            ALTER COLUMN "invoiceAllowanceChargeBaseAmount" TYPE numeric(10,2),
            ALTER COLUMN "invoiceTaxTotalTaxAmount" TYPE numeric(10,2),
            ALTER COLUMN "invoiceWithholdingTaxTotalTaxAmount" TYPE numeric(10,2),
            ALTER COLUMN "invoiceLineExtensionAmount" TYPE numeric(10,2),
            ALTER COLUMN "invoiceTaxExclusiveAmount" TYPE numeric(10,2),
            ALTER COLUMN "invoiceTaxInclusiveAmount" TYPE numeric(10,2),
            ALTER COLUMN "invoiceAllowanceTotalAmount" TYPE numeric(10,2),
            ALTER COLUMN "invoiceChargeTotalAmount" TYPE numeric(10,2),
            ALTER COLUMN "invoicePayableAmount" TYPE numeric(10,2);
        `);

    // Revert Invoice Line table columns
    await queryRunner.query(`
            ALTER TABLE "invoice_line" 
            ALTER COLUMN "quantity" TYPE numeric(10,2),
            ALTER COLUMN "lineExtensionAmount" TYPE numeric(10,2),
            ALTER COLUMN "allowanceChargeMultiplierFactorNumeric" TYPE numeric(10,2),
            ALTER COLUMN "allowanceChargeAmount" TYPE numeric(10,2),
            ALTER COLUMN "allowanceChargeBaseAmount" TYPE numeric(10,2),
            ALTER COLUMN "withholdingTaxTotalAmount" TYPE numeric(10,2),
            ALTER COLUMN "withholdingTaxPercent" TYPE numeric(10,2),
            ALTER COLUMN "withholdingTaxableAmount" TYPE numeric(10,2),
            ALTER COLUMN "taxTotalAmount" TYPE numeric(10,2),
            ALTER COLUMN "taxableAmount" TYPE numeric(10,2),
            ALTER COLUMN "priceAmount" TYPE numeric(10,2);
        `);
  }
}

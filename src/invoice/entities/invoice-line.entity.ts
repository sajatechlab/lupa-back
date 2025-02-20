import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity()
export class InvoiceLine {
  @PrimaryColumn('uuid')
  id: string;

  @Column('text')
  invoiceId: string;

  @Column({ nullable: true })
  lineID: string;

  @Column({ type: 'text', nullable: true })
  itemDescription: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ nullable: true })
  invoicedQuantityUnitCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  lineExtensionAmount: number;

  @Column({ nullable: true })
  buyersItemID: string;

  @Column({ nullable: true })
  standardItemID: string;

  @Column({ nullable: true })
  standardItemSchemeID: string;

  @Column({ nullable: true })
  standardItemSchemeName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  taxTotalAmount: number;

  @Column({ nullable: true })
  taxTotalAmountCurrencyID: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  taxableAmount: number;

  @Column({ nullable: true })
  taxableAmountCurrencyID: string;

  @Column({ nullable: true })
  taxSchemeID: string;

  @Column({ nullable: true })
  taxSchemeName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceAmount: number;

  @Column({ nullable: true })
  priceAmountCurrencyID: string;

  @Column({ nullable: true })
  allowanceChargeID: string;

  @Column({ nullable: true })
  allowanceChargeIndicator: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  allowanceChargeMultiplierFactorNumeric: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  allowanceChargeAmount: number;

  @Column({ nullable: true })
  allowanceChargeAmountCurrency: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  allowanceChargeBaseAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  withholdingTaxTotalAmount: number;

  @Column({ nullable: true })
  withholdingTaxTotalAmountCurrency: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  withholdingTaxableAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  withholdingTaxPercent: number;

  @Column({ nullable: true })
  withholdingTaxSchemeID: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.lines, { onDelete: 'CASCADE' })
  invoice: Invoice;
}

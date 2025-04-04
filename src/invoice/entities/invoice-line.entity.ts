import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
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

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ nullable: true })
  invoicedQuantityUnitCode: string;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  lineExtensionAmount: number;

  @Column({ nullable: true })
  buyersItemID: string;

  @Column({ nullable: true })
  standardItemID: string;

  @Column({ nullable: true })
  standardItemSchemeID: string;

  @Column({ nullable: true })
  standardItemSchemeName: string;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  taxTotalAmount: number;

  @Column({ nullable: true })
  taxTotalAmountCurrencyID: string;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  taxableAmount: number;

  @Column({ nullable: true })
  taxableAmountCurrencyID: string;

  @Column({ nullable: true })
  taxSchemeID: string;

  @Column({ nullable: true })
  taxSchemeName: string;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  priceAmount: number;

  @Column({ nullable: true })
  priceAmountCurrencyID: string;

  @Column({ nullable: true })
  allowanceChargeID: string;

  @Column({ nullable: true })
  allowanceChargeIndicator: boolean;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  allowanceChargeMultiplierFactorNumeric: number;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  allowanceChargeAmount: number;

  @Column({ nullable: true })
  allowanceChargeAmountCurrency: string;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  allowanceChargeBaseAmount: number;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  withholdingTaxTotalAmount: number;

  @Column({ nullable: true })
  withholdingTaxTotalAmountCurrency: string;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  withholdingTaxableAmount: number;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  taxPercent: number;

  @Column({ nullable: true })
  withholdingTaxSchemeID: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;
}

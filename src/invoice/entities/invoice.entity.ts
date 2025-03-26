import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { InvoiceLine } from './invoice-line.entity';
import { InvoiceType } from '../enums/invoice-type.enum';

@Entity()
export class Invoice {
  @PrimaryColumn('text')
  uuid: string;

  @Column()
  invoiceNumber: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  thirdPartyId: string;

  @Column({
    type: 'enum',
    enum: InvoiceType,
  })
  type: InvoiceType;

  @ManyToOne(() => Company, (company) => company.ownedInvoices)
  company: Company;

  @ManyToOne(() => Company, (company) => company.thirdPartyInvoices)
  thirdParty: Company;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'time' })
  issueTime: Date;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ nullable: true })
  invoiceTypeCode: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'char', length: 3, nullable: true })
  documentCurrencyCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  invoiceAllowanceChargeMultiplierFactorNumeric: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  invoiceAllowanceChargeAmount: number;

  @Column({ type: 'char', length: 3, nullable: true })
  invoiceAllowanceChargeAmountCurrencyID: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  invoiceAllowanceChargeBaseAmount: number;

  @Column({ type: 'char', length: 3, nullable: true })
  invoiceAllowanceChargeBaseAmountCurrencyID: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  invoiceTaxTotalTaxAmount: number;

  @Column({ type: 'char', length: 3, nullable: true })
  invoiceTaxTotalTaxAmountCurrencyID: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  invoiceWithholdingTaxTotalTaxAmount: number;

  @Column({ type: 'char', length: 3, nullable: true })
  invoiceWithholdingTaxTotalTaxAmountCurrencyID: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  invoiceLineExtensionAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  invoiceTaxExclusiveAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  invoiceTaxInclusiveAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  invoiceAllowanceTotalAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  invoiceChargeTotalAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  invoicePayableAmount: number;

  @Column({ type: 'boolean', default: false })
  isPosted: boolean;

  @Column({ nullable: true })
  fileName: string;

  @OneToMany(() => InvoiceLine, (line) => line.invoice)
  lines: InvoiceLine[];
}

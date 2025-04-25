import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { InvoiceLine } from './invoice-line.entity';
import { InvoiceType } from '../enums/invoice-type.enum';

@Entity()
export class Invoice {
  @PrimaryColumn('text')
  uuid: string;

  @Column({ nullable: true })
  prefix: string;

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

  @Column({ type: 'date', nullable: true })
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

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  invoiceAllowanceChargeMultiplierFactorNumeric: number;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  invoiceAllowanceChargeAmount: number;

  @Column({ type: 'char', length: 3, nullable: true })
  invoiceAllowanceChargeAmountCurrencyID: string;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  invoiceAllowanceChargeBaseAmount: number;

  @Column({ type: 'char', length: 3, nullable: true })
  invoiceAllowanceChargeBaseAmountCurrencyID: string;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  invoiceTaxTotalTaxAmount: number;

  @Column({ type: 'char', length: 3, nullable: true })
  invoiceTaxTotalTaxAmountCurrencyID: string;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  invoiceWithholdingTaxTotalTaxAmount: number;

  @Column({ type: 'char', length: 3, nullable: true })
  invoiceWithholdingTaxTotalTaxAmountCurrencyID: string;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  invoiceLineExtensionAmount: number;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  invoiceTaxExclusiveAmount: number;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  invoiceTaxInclusiveAmount: number;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  invoiceAllowanceTotalAmount: number;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  invoiceChargeTotalAmount: number;

  @Column('numeric', { precision: 20, scale: 6, nullable: true })
  invoicePayableAmount: number;

  @Column({ type: 'boolean', default: false })
  isPosted: boolean;

  @Column({ nullable: true })
  fileName: string;

  @OneToMany(() => InvoiceLine, (line) => line.invoice)
  lines: InvoiceLine[];

  @Column({ type: 'integer', nullable: true })
  paymentMethod: number;
}

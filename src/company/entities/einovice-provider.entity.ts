import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { EInvoiceProviderEnum } from '../enums/invoice-provider.enum';

@Entity()
export class InvoiceProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  companyName?: string;

  @Column({ nullable: true })
  prefix?: string;

  @Column({ nullable: true })
  documentType?: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  // SIIGO-specific properties
  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  accessKey?: string;

  @Column({
    type: 'enum',
    enum: EInvoiceProviderEnum,
    nullable: true,
  })
  provider: EInvoiceProviderEnum;
}

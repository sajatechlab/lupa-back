import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { Invoice } from '../../invoice/entities/invoice.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  additionalAccountID: string;

  @Column({ nullable: true })
  industryClassificationCode: string;

  @Column({ nullable: true })
  physicalLocationID: string;

  @Column({ nullable: true })
  countrySubentityCode: string;

  @Column({ nullable: true })
  line: string;

  @Column({ nullable: true })
  registrationName: string;

  @Column({ nullable: true })
  taxLevelCode: string;

  @Column({ nullable: true })
  taxSchemeID: string;

  @Column({ nullable: true })
  taxSchemeName: string;

  @Column({ nullable: true })
  companyID: string;

  @Column({ nullable: true })
  companyIDSchemeID: string;

  @Column({ nullable: true })
  companyIDSchemeName: string;

  @Column({ nullable: true })
  companyIDSchemeAgencyID: string;

  @Column({ nullable: true })
  contactName: string;

  @Column({ nullable: true })
  contactTelephone: string;

  @Column({ nullable: true })
  contactTelefax: string;

  @Column({ nullable: true })
  contactElectronicMail: string;

  @Column({ type: 'text', nullable: true })
  contactNote: string;

  @Column({ nullable: true })
  registrationAddressID: string;

  @Column({ unique: true })
  nit: string;

  @Column()
  name: string;

  @OneToMany(() => Invoice, (invoice) => invoice.company)
  ownedInvoices: Invoice[];

  @OneToMany(() => Invoice, (invoice) => invoice.thirdParty)
  thirdPartyInvoices: Invoice[];

  @ManyToMany(() => User, (user) => user.companies)
  users: User[];
}

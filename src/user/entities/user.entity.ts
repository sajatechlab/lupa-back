import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Company } from '../../company/entities/company.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @ManyToMany(() => Company)
  @JoinTable({
    name: 'user_companies',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'company_id',
      referencedColumnName: 'id',
    },
  })
  companies: Company[];

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verifiedAt: Date;
}

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class SoftwareProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nit: string;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';

export type UserRole = 'admin' | 'editor' | 'leitor';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  nome: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'senha_hash' })
  senhaHash: string;

  @Column({ default: 'leitor' })
  papel: UserRole;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @Column({ name: 'ultimo_acesso', type: 'timestamptz', nullable: true })
  ultimoAcesso: Date | null;
}
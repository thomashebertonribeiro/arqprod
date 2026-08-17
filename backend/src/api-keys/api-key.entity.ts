import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';

export type ApiKeyStatus = 'ativa' | 'revogada';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  nome: string;

  @Column({ name: 'chave_hash', unique: true })
  chaveHash: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  escopos: string[];

  @Column({ name: 'ultima_utilizacao', type: 'timestamptz', nullable: true })
  ultimaUtilizacao: Date | null;

  @Column({ name: 'expira_em', type: 'timestamptz', nullable: true })
  expiraEm: Date | null;

  @Column({ default: 'ativa' })
  status: ApiKeyStatus;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
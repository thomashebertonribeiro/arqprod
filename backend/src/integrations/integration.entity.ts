import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';

export type IntegrationType =
  | 'shopify'
  | 'woocommerce'
  | 'mercado_livre'
  | 'planilha'
  | 'custom';
export type IntegrationStatus = 'ativa' | 'com_erro' | 'pausada';

@Entity('integrations')
export class Integration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  tipo: IntegrationType;

  @Column()
  nome: string;

  @Column({ type: 'jsonb', nullable: true })
  credenciais: Record<string, unknown> | null;

  @Column({ default: 'ativa' })
  status: IntegrationStatus;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  configuracao: Record<string, unknown>;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
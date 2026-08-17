import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { WebhookDelivery } from './webhook-delivery.entity';

export type WebhookStatus = 'ativo' | 'pausado';

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'url_destino', type: 'varchar', length: 1024 })
  urlDestino: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  eventos: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  segredo: string | null;

  @Column({ default: 'ativo' })
  status: WebhookStatus;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @OneToMany(() => WebhookDelivery, (d) => d.webhook)
  deliveries: WebhookDelivery[];
}
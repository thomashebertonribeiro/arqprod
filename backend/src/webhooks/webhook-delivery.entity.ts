import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Webhook } from './webhook.entity';

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'webhook_id' })
  webhookId: string;

  @ManyToOne(() => Webhook, (w) => w.deliveries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'webhook_id' })
  webhook: Webhook;

  @Column({ type: 'varchar', length: 60 })
  evento: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload: Record<string, unknown>;

  @Column({ name: 'status_http_resposta', type: 'int', nullable: true })
  statusHttpResposta: number | null;

  @Column({ default: 0 })
  tentativas: number;

  @Column({ name: 'enviado_em', type: 'timestamptz', nullable: true })
  enviadoEm: Date | null;
}
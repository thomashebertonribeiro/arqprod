import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Integration } from '../integrations/integration.entity';

export type SyncStatus = 'sucesso' | 'erro' | 'parcial';

@Entity('sync_logs')
export class SyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'integration_id' })
  integrationId: string;

  @ManyToOne(() => Integration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'integration_id' })
  integration: Integration;

  @Column({ name: 'iniciado_em', type: 'timestamptz', default: () => 'now()' })
  iniciadoEm: Date;

  @Column({ name: 'finalizado_em', type: 'timestamptz', nullable: true })
  finalizadoEm: Date | null;

  @Column({ default: 'erro' })
  status: SyncStatus;

  @Column({ name: 'itens_processados', default: 0 })
  itensProcessados: number;

  @Column({ name: 'itens_com_erro', default: 0 })
  itensComErro: number;

  @Column({ type: 'jsonb', nullable: true })
  detalhes: Record<string, unknown> | null;
}
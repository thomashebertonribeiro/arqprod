import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { AiModel } from './ai-model.entity';

@Entity('ai_model_routing')
@Unique('UQ_ai_model_routing_org_task', ['organizationId', 'taskType'])
export class AiModelRouting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'task_type', length: 50 })
  taskType: string;

  @Column({ name: 'required_capabilities', type: 'jsonb', default: '{}' })
  requiredCapabilities: Record<string, unknown>;

  @Column({
    name: 'max_cost_per_1k',
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
  })
  maxCostPer1k: string;

  @Column({ name: 'model_priority', type: 'uuid', array: true })
  modelPriority: string[];

  @Column({ name: 'fallback_enabled', default: true })
  fallbackEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
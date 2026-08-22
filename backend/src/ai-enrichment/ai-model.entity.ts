import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';

export type AIProvider = 'ollama' | 'vllm' | 'openai' | 'anthropic' | 'openai-compatible';

@Entity('ai_models')
@Unique('UQ_ai_model_org_name', ['organizationId', 'name'])
export class AiModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50 })
  provider: string;

  @Column({ name: 'base_url', nullable: true })
  baseUrl: string;

  @Column({ name: 'api_key_encrypted', nullable: true })
  apiKeyEncrypted: string;

  @Column({ name: 'model_identifier', length: 200 })
  modelIdentifier: string;

  @Column({ type: 'jsonb', default: '{}' })
  capabilities: Record<string, unknown>;

  @Column({ name: 'context_window', default: 4096 })
  contextWindow: number;

  @Column({
    name: 'cost_per_1k_input',
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 0,
  })
  costPer1kInput: string;

  @Column({
    name: 'cost_per_1k_output',
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 0,
  })
  costPer1kOutput: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 1 })
  priority: number;

  @Column({ type: 'jsonb', default: '{}' })
  config: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
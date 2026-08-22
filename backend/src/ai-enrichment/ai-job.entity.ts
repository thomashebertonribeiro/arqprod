import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { Product } from '../products/product.entity';
import { AiModel } from './ai-model.entity';
import { AiPrompt } from './ai-prompt.entity';
import { User } from '../users/user.entity';

export type AIJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'review_required'
  | 'approved'
  | 'rejected';

export type AITaskType =
  | 'extraction'
  | 'enrichment'
  | 'generation'
  | 'classification'
  | 'vision'
  | 'readiness';

@Entity('ai_jobs')
export class AiJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'product_id', nullable: true })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ length: 30, default: 'queued' })
  status: AIJobStatus;

  @Column({ name: 'task_type', length: 50 })
  taskType: AITaskType;

  @Column({ length: 50 })
  provider: string;

  @Column({ name: 'model_id', nullable: true })
  modelId: string;

  @ManyToOne(() => AiModel, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'model_id' })
  model: AiModel;

  @Column({ name: 'prompt_id', nullable: true })
  promptId: string;

  @ManyToOne(() => AiPrompt, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'prompt_id' })
  prompt: AiPrompt;

  @Column({ name: 'input_sources', type: 'jsonb', default: '[]' })
  inputSources: Record<string, unknown>[];

  @Column({ name: 'input_context', type: 'jsonb', default: '{}' })
  inputContext: Record<string, unknown>;

  @Column({ name: 'output_structured', type: 'jsonb', nullable: true })
  outputStructured: Record<string, unknown>;

  @Column({ name: 'output_raw', type: 'text', nullable: true })
  outputRaw: string;

  @Column({
    name: 'confidence_avg',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  confidenceAvg: string;

  @Column({ name: 'tokens_input', default: 0 })
  tokensInput: number;

  @Column({ name: 'tokens_output', default: 0 })
  tokensOutput: number;

  @Column({
    name: 'cost_estimate',
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 0,
  })
  costEstimate: string;

  @Column({ nullable: true, type: 'text' })
  error: string;

  @Column({ name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
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
import { AiJob } from './ai-job.entity';
import { AiModel } from './ai-model.entity';
import { AiSource } from './ai-source.entity';
import { User } from '../users/user.entity';

export type AISuggestionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'auto_approved'
  | 'conflict';

export type AISuggestionFieldType =
  | 'product_field'
  | 'variant_field'
  | 'attribute'
  | 'generated_content';

@Entity('ai_suggestions')
export class AiSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'job_id' })
  jobId: string;

  @ManyToOne(() => AiJob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: AiJob;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'field_path', length: 200 })
  fieldPath: string;

  @Column({ name: 'field_type', length: 50 })
  fieldType: AISuggestionFieldType;

  @Column({ name: 'current_value', type: 'jsonb', nullable: true })
  currentValue: Record<string, unknown>;

  @Column({ name: 'suggested_value', type: 'jsonb' })
  suggestedValue: Record<string, unknown>;

  @Column({
    name: 'confidence',
    type: 'decimal',
    precision: 5,
    scale: 4,
  })
  confidence: string;

  @Column({ name: 'source_id', nullable: true })
  sourceId: string;

  @ManyToOne(() => AiSource, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_id' })
  source: AiSource;

  @Column({ name: 'all_sources', type: 'jsonb', default: '[]' })
  allSources: Record<string, unknown>[];

  @Column({ name: 'model_id', nullable: true })
  modelId: string;

  @ManyToOne(() => AiModel, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'model_id' })
  model: AiModel;

  @Column({ name: 'prompt_version', nullable: true })
  promptVersion: number;

  @Column({ name: 'extraction_method', length: 50, nullable: true })
  extractionMethod: string;

  @Column({ length: 20, default: 'pending' })
  status: AISuggestionStatus;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedByUser: User;

  @Column({ name: 'reviewed_at', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
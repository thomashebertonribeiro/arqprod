import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { AiJob } from './ai-job.entity';

export type AISourceType = 'pdf' | 'image' | 'csv' | 'url' | 'text';

@Entity('ai_sources')
export class AiSource {
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

  @Column({ length: 30 })
  type: AISourceType;

  @Column({ name: 'original_filename', length: 300, nullable: true })
  originalFilename: string;

  @Column({ name: 'storage_path', nullable: true })
  storagePath: string;

  @Column({ name: 'mime_type', length: 100, nullable: true })
  mimeType: string;

  @Column({ name: 'page_numbers', type: 'int', array: true, nullable: true })
  pageNumbers: number[];

  @Column({ name: 'extracted_text', type: 'text', nullable: true })
  extractedText: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
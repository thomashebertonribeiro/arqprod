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
import { User } from '../users/user.entity';

@Entity('ai_prompts')
@Unique('UQ_ai_prompt_org_name_version', ['organizationId', 'name', 'version'])
export class AiPrompt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 100 })
  name: string;

  @Column({ default: 1 })
  version: number;

  @Column({ name: 'task_type', length: 50 })
  taskType: string;

  @Column({ name: 'system_prompt', type: 'text' })
  systemPrompt: string;

  @Column({ name: 'user_prompt_template', type: 'text' })
  userPromptTemplate: string;

  @Column({ name: 'output_schema', type: 'jsonb' })
  outputSchema: Record<string, unknown>;

  @Column({ name: 'input_variables', type: 'jsonb', default: '[]' })
  inputVariables: string[];

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ default: true })
  active: boolean;

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
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';

export type ChannelType = 'site_proprio' | 'marketplace' | 'atacado' | 'revenda';

@Entity('channels')
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  nome: string;

  @Column({ default: 'site_proprio' })
  tipo: ChannelType;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
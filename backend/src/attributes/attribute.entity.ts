import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { AttributeGroup } from '../attribute-groups/attribute-group.entity';
import { User } from '../users/user.entity';
import { AttributeValidationRule } from './attribute-validation-rule.entity';
import { AttributeOption } from './attribute-option.entity';

export type AttributeDataType =
  | 'texto'
  | 'numero'
  | 'booleano'
  | 'lista'
  | 'lista_multipla'
  | 'data';
export type AttributeLevel = 'produto' | 'variacao';
export type AttributeStatus = 'ativo' | 'arquivado';

@Entity('attributes')
@Unique('UQ_attribute_org_chave', ['organizationId', 'chave'])
export class Attribute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'attribute_group_id', type: 'uuid', nullable: true })
  attributeGroupId: string | null;

  @ManyToOne(() => AttributeGroup, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'attribute_group_id' })
  attributeGroup: AttributeGroup | null;

  @Column()
  nome: string;

  @Column()
  chave: string;

  @Column({ name: 'tipo_dado' })
  tipoDado: AttributeDataType;

  @Column({ default: 'produto' })
  nivel: AttributeLevel;

  @Column({ default: 'ativo' })
  status: AttributeStatus;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @Column({ name: 'criado_por', type: 'uuid', nullable: true })
  criadoPor: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'criado_por' })
  createdByUser: User | null;

  @OneToMany(() => AttributeValidationRule, (r) => r.attribute, {
    cascade: true,
    eager: true,
  })
  validationRules: AttributeValidationRule[];

  @OneToMany(() => AttributeOption, (o) => o.attribute, { cascade: true })
  options: AttributeOption[];
}
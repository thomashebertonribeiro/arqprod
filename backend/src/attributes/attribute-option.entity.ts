import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Attribute } from './attribute.entity';

@Entity('attribute_options')
export class AttributeOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'attribute_id' })
  attributeId: string;

  @ManyToOne(() => Attribute, (a) => a.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_id' })
  attribute: Attribute;

  @Column()
  valor: string;

  @Column({ default: 0 })
  ordem: number;

  @Column({ default: 'ativo' })
  status: 'ativo' | 'arquivado';
}
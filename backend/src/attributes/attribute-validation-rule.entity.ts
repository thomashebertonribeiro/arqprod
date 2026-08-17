import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Attribute } from './attribute.entity';

@Entity('attribute_validation_rules')
export class AttributeValidationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'attribute_id' })
  attributeId: string;

  @OneToOne(() => Attribute, (a) => a.validationRules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_id' })
  attribute: Attribute;

  @Column({ default: false })
  obrigatorio: boolean;

  @Column({ name: 'valor_min', type: 'numeric', nullable: true, precision: 18, scale: 6 })
  valorMin: string | null;

  @Column({ name: 'valor_max', type: 'numeric', nullable: true, precision: 18, scale: 6 })
  valorMax: string | null;

  @Column({ name: 'tamanho_max', type: 'int', nullable: true })
  tamanhoMax: number | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  regex: string | null;

  @Column({ name: 'mensagem_erro', type: 'varchar', length: 512, nullable: true })
  mensagemErro: string | null;
}
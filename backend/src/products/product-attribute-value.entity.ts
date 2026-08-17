import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';
import { Attribute } from '../attributes/attribute.entity';
import { User } from '../users/user.entity';

@Entity('product_attribute_values')
@Unique('UQ_product_attribute', ['productId', 'attributeId'])
export class ProductAttributeValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, (p) => p.attributeValues, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'attribute_id' })
  attributeId: string;

  @ManyToOne(() => Attribute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_id' })
  attribute: Attribute;

  @Column({ type: 'jsonb', nullable: true })
  valor: unknown;

  @Column({ name: 'atualizado_em', type: 'timestamptz', default: () => 'now()' })
  atualizadoEm: Date;

  @Column({ name: 'atualizado_por', type: 'uuid', nullable: true })
  atualizadoPor: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'atualizado_por' })
  updatedByUser: User | null;
}
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { Attribute } from '../attributes/attribute.entity';

@Entity('product_variant_attribute_values')
@Unique('UQ_variant_attribute', ['productVariantId', 'attributeId'])
export class ProductVariantAttributeValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_variant_id' })
  productVariantId: string;

  @ManyToOne(() => ProductVariant, (v) => v.attributeValues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_variant_id' })
  productVariant: ProductVariant;

  @Column({ name: 'attribute_id' })
  attributeId: string;

  @ManyToOne(() => Attribute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_id' })
  attribute: Attribute;

  @Column({ type: 'jsonb', nullable: true })
  valor: unknown;

  @Column({ name: 'atualizado_em', type: 'timestamptz', default: () => 'now()' })
  atualizadoEm: Date;
}
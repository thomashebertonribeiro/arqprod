import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { ProductVariantAttributeValue } from './product-variant-attribute-value.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, (p) => p.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ unique: true })
  sku: string;

  @Column({ name: 'ean_gtin', type: 'varchar', length: 40, nullable: true })
  eanGtin: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  combinacao: Record<string, string>;

  @Column({ name: 'peso_kg', type: 'numeric', precision: 12, scale: 4, nullable: true })
  pesoKg: string | null;

  @Column({ type: 'jsonb', nullable: true })
  dimensoes: Record<string, unknown> | null;

  @Column({ default: 'ativo' })
  status: 'ativo' | 'inativo';

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;

  @OneToMany(() => ProductVariantAttributeValue, (v) => v.productVariant)
  attributeValues: ProductVariantAttributeValue[];
}
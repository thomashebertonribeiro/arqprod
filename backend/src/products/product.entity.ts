import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { Category } from '../categories/category.entity';
import { Supplier } from '../suppliers/supplier.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductAttributeValue } from './product-attribute-value.entity';
import { ProductImage } from './product-image.entity';
import { Tag } from '../tags/tag.entity';

export type ProductStatus = 'rascunho' | 'ativo' | 'inativo' | 'descontinuado';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId: string | null;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier | null;

  @Column()
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string | null;

  @Column({ name: 'sku_base', type: 'varchar', length: 120, nullable: true })
  skuBase: string | null;

  @Column({ name: 'ean_gtin', type: 'varchar', length: 40, nullable: true })
  eanGtin: string | null;

  @Column({ type: 'varchar', length: 12, nullable: true })
  ncm: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  cest: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  custo: string | null;

  @Column({ default: 'rascunho' })
  status: ProductStatus;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  atributos: Record<string, unknown>;

  @Column({ name: 'origem_integracao', type: 'varchar', length: 60, nullable: true })
  origemIntegracao: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;

  @OneToMany(() => ProductVariant, (v) => v.product, { cascade: true })
  variants: ProductVariant[];

  @OneToMany(() => ProductAttributeValue, (v) => v.product)
  attributeValues: ProductAttributeValue[];

  @OneToMany(() => ProductImage, (i) => i.product)
  images: ProductImage[];

  @ManyToMany(() => Tag, { cascade: true })
  @JoinTable({
    name: 'product_tags',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];
}
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
import { Brand } from '../brands/brand.entity';
import { Manufacturer } from '../manufacturers/manufacturer.entity';
import { User } from '../users/user.entity';
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

  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId: string | null;

  @ManyToOne(() => Brand, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand | null;

  @Column({ name: 'manufacturer_id', type: 'uuid', nullable: true })
  manufacturerId: string | null;

  @ManyToOne(() => Manufacturer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manufacturer_id' })
  manufacturer: Manufacturer | null;

  @Column({ name: 'criado_por', type: 'uuid', nullable: true })
  criadoPor: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'criado_por' })
  criadoPorUser: User | null;

  @Column({ name: 'atualizado_por', type: 'uuid', nullable: true })
  atualizadoPor: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'atualizado_por' })
  atualizadoPorUser: User | null;

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

  @Column({ name: 'peso_bruto_kg', type: 'numeric', precision: 12, scale: 4, nullable: true })
  pesoBrutoKg: string | null;

  @Column({ name: 'peso_liquido_kg', type: 'numeric', precision: 12, scale: 4, nullable: true })
  pesoLiquidoKg: string | null;

  @Column({ name: 'altura_cm', type: 'numeric', precision: 10, scale: 2, nullable: true })
  alturaCm: string | null;

  @Column({ name: 'largura_cm', type: 'numeric', precision: 10, scale: 2, nullable: true })
  larguraCm: string | null;

  @Column({ name: 'profundidade_cm', type: 'numeric', precision: 10, scale: 2, nullable: true })
  profundidadeCm: string | null;

  @Column({ name: 'unidade_venda', type: 'varchar', length: 20, nullable: true })
  unidadeVenda: string | null;

  @Column({ name: 'data_lancamento', type: 'timestamptz', nullable: true })
  dataLancamento: Date | null;

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
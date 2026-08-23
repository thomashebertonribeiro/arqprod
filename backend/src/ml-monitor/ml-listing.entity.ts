import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { Product } from '../products/product.entity';
import { ProductVariant } from '../products/product-variant.entity';

export type MlListingStatus =
  | 'draft'
  | 'publishing'
  | 'active'
  | 'paused'
  | 'ended'
  | 'error';

@Entity('ml_listings')
@Index('UQ_ml_listing_variant_ml', ['productVariantId', 'mlItemId'], { unique: true, where: '"ml_item_id" IS NOT NULL' })
export class MlListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_variant_id' })
  productVariantId: string;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_variant_id' })
  productVariant: ProductVariant;

  @Column({ name: 'ml_item_id', type: 'varchar', length: 30, nullable: true })
  mlItemId: string | null;

  @Column({ name: 'ml_permalink', type: 'text', nullable: true })
  mlPermalink: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: MlListingStatus;

  @Column({ type: 'varchar', length: 3, default: 'BRL' })
  moeda: string;

  @Column({ name: 'preco', type: 'numeric', precision: 18, scale: 2 })
  preco: string;

  @Column({ name: 'preco_promocional', type: 'numeric', precision: 18, scale: 2, nullable: true })
  precoPromocional: string | null;

  @Column({ name: 'quantidade', type: 'int', default: 1 })
  quantidade: number;

  @Column({ name: 'title', type: 'varchar', length: 60, nullable: true })
  title: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'category_mlb', type: 'varchar', length: 30, nullable: true })
  categoryMlb: string | null;

  @Column({ name: 'condition', type: 'varchar', length: 20, default: 'new' })
  condition: string;

  @Column({ name: 'attributes', type: 'jsonb', default: () => "'[]'" })
  attributes: Record<string, unknown>[];

  @Column({ name: 'pictures', type: 'jsonb', default: () => "'[]'" })
  pictures: { id?: string; url: string }[];

  @Column({ name: 'shipping', type: 'jsonb', default: () => "'{}'" })
  shipping: Record<string, unknown>;

  @Column({ name: 'seller_id', type: 'varchar', length: 30, nullable: true })
  sellerId: string | null;

  @Column({ name: 'last_sync_at', type: 'timestamptz', nullable: true })
  lastSyncAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'ml_created_at', type: 'timestamptz', nullable: true })
  mlCreatedAt: Date | null;

  @Column({ name: 'ml_updated_at', type: 'timestamptz', nullable: true })
  mlUpdatedAt: Date | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;
}

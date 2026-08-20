import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { User } from '../users/user.entity';

export type ProductAuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'duplicated'
  | 'variant_created'
  | 'variant_updated'
  | 'variant_deleted'
  | 'attribute_values_saved'
  | 'image_added'
  | 'tag_added'
  | 'tag_removed'
  | 'price_set'
  | 'stock_set';

@Entity('product_audits')
@Index('IDX_product_audits_product', ['productId'])
export class ProductAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, (p) => p.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ length: 40 })
  acao: ProductAuditAction;

  @Column({ type: 'jsonb', nullable: true })
  detalhes: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
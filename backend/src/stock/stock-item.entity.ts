import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ProductVariant } from '../products/product-variant.entity';
import { Warehouse } from '../warehouses/warehouse.entity';

@Entity('stock_items')
@Unique('UQ_stock_variant_warehouse', ['productVariantId', 'warehouseId'])
export class StockItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_variant_id' })
  productVariantId: string;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_variant_id' })
  productVariant: ProductVariant;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ default: 0 })
  quantidade: number;

  @Column({ default: 0 })
  reservado: number;

  @Column({ name: 'atualizado_em', type: 'timestamptz', default: () => 'now()' })
  atualizadoEm: Date;
}
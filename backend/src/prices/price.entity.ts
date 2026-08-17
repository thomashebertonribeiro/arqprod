import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ProductVariant } from '../products/product-variant.entity';
import { Channel } from '../channels/channel.entity';

@Entity('prices')
@Unique('UQ_price_variant_channel_currency', ['productVariantId', 'channelId', 'moeda'])
export class Price {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_variant_id' })
  productVariantId: string;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_variant_id' })
  productVariant: ProductVariant;

  @Column({ name: 'channel_id' })
  channelId: string;

  @ManyToOne(() => Channel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @Column({ length: 3, default: 'BRL' })
  moeda: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  valor: string;

  @Column({ name: 'valor_promocional', type: 'numeric', precision: 18, scale: 2, nullable: true })
  valorPromocional: string | null;

  @Column({ name: 'promocao_inicio', type: 'timestamptz', nullable: true })
  promocaoInicio: Date | null;

  @Column({ name: 'promocao_fim', type: 'timestamptz', nullable: true })
  promocaoFim: Date | null;
}
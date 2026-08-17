import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductAttributeValue } from './product-attribute-value.entity';
import { ProductVariantAttributeValue } from './product-variant-attribute-value.entity';
import { ProductImage } from './product-image.entity';
import { Attribute } from '../attributes/attribute.entity';
import { StockItem } from '../stock/stock-item.entity';
import { Price } from '../prices/price.entity';
import { Tag } from '../tags/tag.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductVariant,
      ProductAttributeValue,
      ProductVariantAttributeValue,
      ProductImage,
      Attribute,
      StockItem,
      Price,
      Tag,
    ]),
    WebhooksModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}
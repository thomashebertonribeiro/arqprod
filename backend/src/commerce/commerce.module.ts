import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Channel } from '../channels/channel.entity';
import { Price } from '../prices/price.entity';
import { Warehouse } from '../warehouses/warehouse.entity';
import { StockItem } from '../stock/stock-item.entity';
import { Supplier } from '../suppliers/supplier.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { ProductAudit } from '../products/product-audit.entity';
import {
  ChannelsController,
  PricesController,
  StockController,
  SuppliersController,
  WarehousesController,
} from './commerce.controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([Channel, Price, Warehouse, StockItem, Supplier, ProductVariant, ProductAudit]),
  ],
  controllers: [
    ChannelsController,
    PricesController,
    WarehousesController,
    StockController,
    SuppliersController,
  ],
  exports: [TypeOrmModule],
})
export class CommerceModule {}
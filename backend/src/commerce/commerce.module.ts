import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Channel } from '../channels/channel.entity';
import { Price } from '../prices/price.entity';
import { Warehouse } from '../warehouses/warehouse.entity';
import { StockItem } from '../stock/stock-item.entity';
import { Supplier } from '../suppliers/supplier.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { ProductAudit } from '../products/product-audit.entity';
import { MlSyncService } from '../ml-monitor/ml-sync.service';
import { MlListing } from '../ml-monitor/ml-listing.entity';
import { MlProviderAdapterService } from '../ml-monitor/ml-provider-adapter.service';
import { Integration } from '../integrations/integration.entity';
import { MlMonitorModule } from '../ml-monitor/ml-monitor.module';
import {
  ChannelsController,
  PricesController,
  StockController,
  SuppliersController,
  WarehousesController,
} from './commerce.controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([Channel, Price, Warehouse, StockItem, Supplier, ProductVariant, ProductAudit, MlListing, Integration]),
    MlMonitorModule,
  ],
  controllers: [
    ChannelsController,
    PricesController,
    WarehousesController,
    StockController,
    SuppliersController,
  ],
  providers: [MlSyncService, MlProviderAdapterService],
  exports: [TypeOrmModule, MlSyncService],
})
export class CommerceModule {}
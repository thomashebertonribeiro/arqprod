import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MlListing } from './ml-listing.entity';
import { MlMonitorController } from './ml-monitor.controller';
import { MlMonitorService } from './ml-monitor.service';
import { MlProviderAdapterService } from './ml-provider-adapter.service';
import { MlSyncService } from './ml-sync.service';
import { MlWebhookService } from './ml-webhook.service';
import { ScheduleModule } from '@nestjs/schedule';
import { Integration } from '../integrations/integration.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { Product } from '../products/product.entity';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MlListing, Integration, ProductVariant, Product]),
    ProductsModule,
  ],
  controllers: [MlMonitorController],
  providers: [MlMonitorService, MlProviderAdapterService, MlSyncService, MlWebhookService],
  exports: [MlMonitorService, MlSyncService, MlWebhookService],
})
export class MlMonitorModule {}

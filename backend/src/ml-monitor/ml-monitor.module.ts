import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MlListing } from './ml-listing.entity';
import { MlMonitorController } from './ml-monitor.controller';
import { MlMonitorService } from './ml-monitor.service';
import { MlProviderAdapterService } from './ml-provider-adapter.service';
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
  providers: [MlMonitorService, MlProviderAdapterService],
  exports: [MlMonitorService],
})
export class MlMonitorModule {}

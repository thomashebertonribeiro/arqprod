import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ApiKey } from './api-keys/api-key.entity';
import { AuthGuard } from './common/auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AttributesModule } from './attributes/attributes.module';
import { AttributeGroupsModule } from './attribute-groups/attribute-groups.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CommerceModule } from './commerce/commerce.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { MetaController } from './meta/meta.controller';
import { UploadsController } from './uploads/uploads.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url:
          config.get<string>('DATABASE_URL') ??
          'postgresql://arqprod:arqprod@localhost:5432/arqprod',
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
      }),
    }),
    TypeOrmModule.forFeature([ApiKey]),
    AuthModule,
    ApiKeysModule,
    UsersModule,
    OrganizationsModule,
    AttributesModule,
    AttributeGroupsModule,
    CategoriesModule,
    ProductsModule,
    CommerceModule,
    WebhooksModule,
    IntegrationsModule,
  ],
  controllers: [MetaController, UploadsController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { CategoryAttribute } from './category-attribute.entity';
import { Attribute } from '../attributes/attribute.entity';
import { CategoriesController } from './categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category, CategoryAttribute, Attribute])],
  controllers: [CategoriesController],
  exports: [TypeOrmModule],
})
export class CategoriesModule {}
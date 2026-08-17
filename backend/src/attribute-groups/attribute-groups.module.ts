import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttributeGroup } from './attribute-group.entity';
import { AttributeGroupsController } from './attribute-groups.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AttributeGroup])],
  controllers: [AttributeGroupsController],
  exports: [TypeOrmModule],
})
export class AttributeGroupsModule {}
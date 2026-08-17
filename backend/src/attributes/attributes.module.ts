import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attribute } from './attribute.entity';
import { AttributeOption } from './attribute-option.entity';
import { AttributeValidationRule } from './attribute-validation-rule.entity';
import { AttributesController } from './attributes.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attribute,
      AttributeOption,
      AttributeValidationRule,
    ]),
  ],
  controllers: [AttributesController],
  exports: [TypeOrmModule],
})
export class AttributesModule {}
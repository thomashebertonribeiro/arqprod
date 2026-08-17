import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Eletrônicos' })
  @IsString()
  @MaxLength(255)
  nome: string;

  @ApiProperty({ example: 'eletronicos' })
  @IsString()
  @MaxLength(255)
  slug: string;

  @ApiPropertyOptional({ description: 'ID da categoria pai para hierarquia' })
  @IsOptional()
  @IsString()
  parent_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;
}

export class LinkAttributeDto {
  @ApiProperty({ description: 'ID do atributo a vincular' })
  @IsString()
  attribute_id: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  obrigatorio_na_categoria?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  herda_de_categoria_pai?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;
}
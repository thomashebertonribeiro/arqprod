import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const PRODUCT_STATUSES = ['rascunho', 'ativo', 'inativo', 'descontinuado'];

export class CreateProductDto {
  @ApiProperty({ example: 'Camiseta Tech Algodão' })
  @IsString()
  @MaxLength(255)
  nome: string;

  @ApiPropertyOptional({ example: 'Camiseta de algodão orgânico' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ example: 'CAM-TEC' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sku_base?: string;

  @ApiPropertyOptional({ example: 'uuid-da-categoria' })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiPropertyOptional({ example: 'uuid-do-fornecedor' })
  @IsOptional()
  @IsString()
  supplier_id?: string;

  @ApiPropertyOptional({ enum: PRODUCT_STATUSES, default: 'rascunho' })
  @IsOptional()
  @IsIn(PRODUCT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ example: 'shopify' })
  @IsOptional()
  @IsString()
  origem_integracao?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category_id?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplier_id?: string | null;

  @ApiPropertyOptional({ enum: PRODUCT_STATUSES })
  @IsOptional()
  @IsIn(PRODUCT_STATUSES)
  status?: string;
}

export class CreateVariantDto {
  @ApiProperty({ example: 'CAM-TEC-AZUL-M' })
  @IsString()
  @MaxLength(120)
  sku: string;

  @ApiPropertyOptional({ example: '7891234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  ean_gtin?: string;

  @ApiPropertyOptional({ example: { cor: 'azul', tamanho: 'M' } })
  @IsOptional()
  @IsObject()
  combinacao?: Record<string, string>;

  @ApiPropertyOptional({ example: 0.25 })
  @IsOptional()
  @IsNumber()
  peso_kg?: number;

  @ApiPropertyOptional({ example: { altura_cm: 1, largura_cm: 20, profundidade_cm: 30 } })
  @IsOptional()
  @IsObject()
  dimensoes?: Record<string, unknown>;
}

export class UpdateVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  ean_gtin?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  combinacao?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  peso_kg?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  dimensoes?: Record<string, unknown> | null;

  @ApiPropertyOptional({ enum: ['ativo', 'inativo'] })
  @IsOptional()
  @IsIn(['ativo', 'inativo'])
  status?: string;
}

export class AttributeValueItemDto {
  @ApiProperty({
    description: 'Chave ou ID do atributo (a chave é imutável e pública na API)',
    example: 'voltagem',
  })
  @IsString()
  atributo: string;

  @ApiProperty({ description: 'Valor conforme tipo do atributo', example: '110V' })
  valor: unknown;
}

export class SaveAttributeValuesDto {
  @ApiProperty({ type: AttributeValueItemDto, isArray: true })
  @IsArray()
  valores: AttributeValueItemDto[];
}

export class CreateImageDto {
  @ApiProperty({ example: 'https://cdn.exemplo.com/camiseta-azul.jpg' })
  @IsString()
  @MaxLength(1024)
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ordem?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt_text?: string;
}
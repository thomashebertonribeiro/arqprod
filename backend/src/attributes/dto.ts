import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ATTRIBUTE_DATA_TYPES } from './attribute-value.validator';
import {
  AttributeDataType,
  AttributeLevel,
  AttributeStatus,
} from './attribute.entity';

export class ValidationRuleDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  obrigatorio?: boolean;

  @ApiPropertyOptional({ description: 'Usado em tipo numero' })
  @IsOptional()
  @IsNumber()
  valor_min?: number;

  @ApiPropertyOptional({ description: 'Usado em tipo numero' })
  @IsOptional()
  @IsNumber()
  valor_max?: number;

  @ApiPropertyOptional({ description: 'Usado em tipo texto' })
  @IsOptional()
  @IsNumber()
  tamanho_max?: number;

  @ApiPropertyOptional({ description: 'Regex aplicada em tipo texto' })
  @IsOptional()
  @IsString()
  regex?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  mensagem_erro?: string;
}

export class AttributeOptionDto {
  @ApiProperty({ example: '110V' })
  @IsString()
  valor: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ordem?: number;
}

export class CreateAttributeDto {
  @ApiProperty({ example: 'Voltagem' })
  @IsString()
  @MaxLength(255)
  nome: string;

  @ApiProperty({ example: 'voltagem' })
  @IsString()
  @MaxLength(255)
  chave: string;

  @ApiProperty({ enum: ATTRIBUTE_DATA_TYPES, example: 'lista' })
  @IsIn(ATTRIBUTE_DATA_TYPES)
  tipo_dado: AttributeDataType;

  @ApiProperty({ enum: ['produto', 'variacao'], default: 'produto' })
  @IsIn(['produto', 'variacao'])
  nivel: AttributeLevel = 'produto';

  @ApiPropertyOptional({ description: 'Agrupamento visual no painel' })
  @IsOptional()
  @IsString()
  attribute_group_id?: string;

  @ApiPropertyOptional({ type: ValidationRuleDto })
  @IsOptional()
  regra_validacao?: ValidationRuleDto;

  @ApiPropertyOptional({
    type: AttributeOptionDto,
    isArray: true,
    description: 'Obrigatório quando tipo_dado é lista ou lista_multipla',
  })
  @IsOptional()
  @IsArray()
  opcoes?: AttributeOptionDto[];
}

export class UpdateAttributeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attribute_group_id?: string;

  @ApiPropertyOptional({ enum: ['ativo', 'arquivado'] })
  @IsOptional()
  @IsIn(['ativo', 'arquivado'])
  status?: AttributeStatus;
}

export class AddAttributeOptionDto {
  @ApiProperty({ example: '220V' })
  @IsString()
  valor: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  ordem?: number;
}
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const API_KEY_SCOPES = [
  'products:read',
  'products:write',
  'catalog:read',
  'catalog:write',
  'inventory:read',
  'inventory:write',
  'pricing:read',
  'pricing:write',
  'webhooks:read',
  'webhooks:write',
] as const;

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Integração Shopify' })
  @IsString()
  @MaxLength(255)
  nome: string;

  @ApiProperty({
    example: ['products:read', 'products:write'],
    enum: API_KEY_SCOPES,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  escopos: string[];

  @ApiProperty({ required: false, example: '2027-01-01T00:00:00Z' })
  @IsOptional()
  @IsString()
  expira_em?: string;
}

export class ApiKeyCreatedDto {
  @ApiProperty({ description: 'Mostrada apenas uma vez' })
  chave: string;

  @ApiProperty()
  id: string;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  escopos: string[];

  @ApiProperty()
  criado_em: Date;
}

export class RevokeApiKeyDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[0-9a-f-]{36}$/)
  id: string;
}
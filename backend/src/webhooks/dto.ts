import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { WEBHOOK_EVENTS } from './webhooks.service';

export class CreateWebhookDto {
  @ApiProperty({ example: 'https://meu-sistema.com/hooks/arqprod' })
  @IsUrl({ require_tld: false })
  url_destino: string;

  @ApiProperty({
    example: ['product.created', 'product.updated'],
    enum: [...WEBHOOK_EVENTS, '*'],
    isArray: true,
    description: 'Use "*" para todos os eventos',
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn([...WEBHOOK_EVENTS, '*'], { each: true })
  eventos: string[];

  @ApiPropertyOptional({ description: 'Segredo usado no header X-Arqprod-Signature (HMAC-SHA256)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  segredo?: string;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  url_destino?: string;

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventos?: string[];

  @ApiPropertyOptional({ enum: ['ativo', 'pausado'] })
  @IsOptional()
  @IsIn(['ativo', 'pausado'])
  status?: 'ativo' | 'pausado';
}
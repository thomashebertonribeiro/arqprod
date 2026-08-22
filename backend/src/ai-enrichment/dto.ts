import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AiModelCapabilitiesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  vision?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  structuredOutput?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  functionCalling?: boolean;
}

export class CreateAiModelDto {
  @ApiProperty({ example: 'qwen2.5-7b-local' })
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ollama', enum: ['ollama', 'vllm', 'openai', 'anthropic', 'openai-compatible'] })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiPropertyOptional({ example: 'http://localhost:11434' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ example: 'sk-xxxxx' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({ example: 'qwen2.5:7b' })
  @IsString()
  @MaxLength(200)
  @IsNotEmpty()
  modelIdentifier: string;

  @ApiPropertyOptional({ type: AiModelCapabilitiesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AiModelCapabilitiesDto)
  capabilities?: AiModelCapabilitiesDto;

  @ApiPropertyOptional({ example: 8192 })
  @IsOptional()
  @IsInt()
  contextWindow?: number;

  @ApiPropertyOptional({ example: '0.0001' })
  @IsOptional()
  @IsNumber()
  costPer1kInput?: number;

  @ApiPropertyOptional({ example: '0.0002' })
  @IsOptional()
  @IsNumber()
  costPer1kOutput?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ example: { temperature: 0.1, top_p: 0.9 } })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateAiModelDto {
  @ApiPropertyOptional({ example: 'qwen2.5-7b-local' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'http://localhost:11434' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ example: 'sk-xxxxx' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ example: 'qwen2.5:7b' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  modelIdentifier?: string;

  @ApiPropertyOptional({ type: AiModelCapabilitiesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AiModelCapabilitiesDto)
  capabilities?: AiModelCapabilitiesDto;

  @ApiPropertyOptional({ example: 8192 })
  @IsOptional()
  @IsInt()
  contextWindow?: number;

  @ApiPropertyOptional({ example: '0.0001' })
  @IsOptional()
  @IsNumber()
  costPer1kInput?: number;

  @ApiPropertyOptional({ example: '0.0002' })
  @IsOptional()
  @IsNumber()
  costPer1kOutput?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ example: { temperature: 0.1, top_p: 0.9 } })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class CreateAiModelRoutingDto {
  @ApiProperty({ example: 'extraction', enum: ['extraction', 'enrichment', 'generation', 'classification', 'vision', 'readiness'] })
  @IsString()
  @IsNotEmpty()
  taskType: string;

  @ApiPropertyOptional({ type: AiModelCapabilitiesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AiModelCapabilitiesDto)
  requiredCapabilities?: AiModelCapabilitiesDto;

  @ApiPropertyOptional({ example: '0.01' })
  @IsOptional()
  @IsNumber()
  maxCostPer1k?: number;

  @ApiProperty({ type: [String], example: ['uuid1', 'uuid2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  modelPriority: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  fallbackEnabled?: boolean;
}

export class CreateAiPromptDto {
  @ApiProperty({ example: 'product_extraction' })
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'extraction', enum: ['extraction', 'generation', 'classification', 'vision'] })
  @IsString()
  @IsNotEmpty()
  taskType: string;

  @ApiProperty({ example: 'Você é um especialista em extração de dados de produtos...' })
  @IsString()
  @IsNotEmpty()
  systemPrompt: string;

  @ApiProperty({ example: 'Extraia os atributos do produto a partir do texto: {{sources}}' })
  @IsString()
  @IsNotEmpty()
  userPromptTemplate: string;

  @ApiProperty({ example: { type: 'object', properties: { attributes: { type: 'array', items: { type: 'object' } } } } })
  @IsObject()
  @IsNotEmpty()
  outputSchema: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String], example: ['attributes', 'sources'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inputVariables?: string[];

  @ApiPropertyOptional({ example: 'Prompt para extração de atributos de produto' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateAiJobDto {
  @ApiPropertyOptional({ example: 'uuid-do-produto' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ enum: ['extraction', 'enrichment', 'generation', 'classification', 'vision', 'readiness'] })
  @IsString()
  @IsNotEmpty()
  taskType: string;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['pdf', 'image', 'csv', 'url', 'text'] },
        storage_path: { type: 'string' },
        url: { type: 'string' },
        pages: { type: 'array', items: { type: 'number' } },
      },
    },
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  inputSources: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  modelId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  promptId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  inputContext?: Record<string, unknown>;
}

export class ApproveSuggestionDto {
  @ApiPropertyOptional({ example: 'Valor corrigido pelo usuário' })
  @IsOptional()
  @IsString()
  editedValue?: string;

  @ApiPropertyOptional({ example: 'Aprovado após verificação manual' })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class RejectSuggestionDto {
  @ApiPropertyOptional({ example: 'Valor incorreto, não corresponde ao produto' })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class BatchApproveSuggestionsDto {
  @ApiProperty({ type: [String], example: ['uuid1', 'uuid2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}

export class BatchRejectSuggestionsDto {
  @ApiProperty({ type: [String], example: ['uuid1', 'uuid2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { CurrentIdentity } from '../common/auth/current-identity.decorator';
import { AiEnrichmentService } from './ai-enrichment.service';
import { AiPromptService } from './ai-prompt.service';
import {
  CreateAiModelDto,
  UpdateAiModelDto,
  CreateAiModelRoutingDto,
  CreateAiPromptDto,
  CreateAiJobDto,
  ApproveSuggestionDto,
  RejectSuggestionDto,
  BatchApproveSuggestionsDto,
  BatchRejectSuggestionsDto,
} from './dto';
import { AiJob, AIJobStatus, AITaskType } from './ai-job.entity';

@ApiTags('ai-enrichment')
@ApiBearerAuth()
@Controller('ai')
export class AiEnrichmentController {
  constructor(
    private readonly service: AiEnrichmentService,
    private readonly promptService: AiPromptService,
    @InjectQueue('ai-enrichment')
    private readonly enrichmentQueue: Queue,
  ) {}

  // ==================== MODELOS ====================

  @Get('models')
  @ApiOperation({ summary: 'Listar modelos de IA configurados' })
  async listModels(@CurrentIdentity() identity: { orgId: string; userId?: string }) {
    return this.service.listModels(identity);
  }

  @Post('models')
  @ApiOperation({ summary: 'Registrar novo modelo de IA' })
  async createModel(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Body() dto: CreateAiModelDto,
  ) {
    return this.service.createModel(identity, dto);
  }

  @Patch('models/:id')
  @ApiOperation({ summary: 'Atualizar modelo de IA' })
  async updateModel(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @Body() dto: UpdateAiModelDto,
  ) {
    return this.service.updateModel(identity, id, dto);
  }

  @Delete('models/:id')
  @ApiOperation({ summary: 'Desativar modelo de IA' })
  async deleteModel(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
  ) {
    return this.service.deleteModel(identity, id);
  }

  // ==================== ROTEAMENTO ====================

  @Get('routing')
  @ApiOperation({ summary: 'Listar regras de roteamento de modelos' })
  async listRouting(@CurrentIdentity() identity: { orgId: string; userId?: string }) {
    return this.service.listRouting(identity);
  }

  @Post('routing')
  @ApiOperation({ summary: 'Criar/atualizar regra de roteamento' })
  async upsertRouting(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Body() dto: CreateAiModelRoutingDto,
  ) {
    return this.service.upsertRouting(identity, dto);
  }

  // ==================== PROMPTS ====================

  @Get('prompts')
  @ApiOperation({ summary: 'Listar prompts versionados' })
  async listPrompts(@CurrentIdentity() identity: { orgId: string; userId?: string }) {
    return this.service.listPrompts(identity);
  }

  @Post('prompts')
  @ApiOperation({ summary: 'Criar novo prompt versionado' })
  async createPrompt(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Body() dto: CreateAiPromptDto,
  ) {
    return this.service.createPrompt(identity, dto);
  }

  @Get('prompts/:name/latest')
  @ApiOperation({ summary: 'Obter última versão ativa de um prompt' })
  async getLatestPrompt(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('name') name: string,
  ) {
    return this.service.getLatestPrompt(identity, name);
  }

  // ==================== JOBS ====================

  @Post('jobs')
  @ApiOperation({ summary: 'Criar job de enriquecimento com IA' })
  async createJob(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Body() dto: CreateAiJobDto,
  ) {
    return this.service.createJob(identity, dto);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Listar jobs de enriquecimento' })
  @ApiQuery({ name: 'status', required: false, enum: ['queued', 'processing', 'completed', 'failed', 'review_required', 'approved', 'rejected'] })
  @ApiQuery({ name: 'product_id', required: false })
  @ApiQuery({ name: 'task_type', required: false, enum: ['extraction', 'enrichment', 'generation', 'classification', 'vision', 'readiness'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'per_page', required: false, example: 20 })
  async listJobs(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Query('status') status?: string,
    @Query('product_id') productId?: string,
    @Query('task_type') taskType?: string,
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    return this.service.listJobs(identity, {
      status: status as any,
      productId,
      taskType: taskType as any,
      page: page ? Number(page) : 1,
      perPage: perPage ? Number(perPage) : 20,
    });
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Detalhe do job' })
  async getJob(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
  ) {
    return this.service.getJob(identity, id);
  }

  @Post('jobs/:id/retry')
  @ApiOperation({ summary: 'Reprocessar job falho' })
  async retryJob(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
  ) {
    return this.service.retryJob(identity, id);
  }

  // ==================== SUGESTÕES ====================

  @Get('suggestions/:productId')
  @ApiOperation({ summary: 'Listar sugestões pendentes de um produto' })
  async listSuggestions(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('productId') productId: string,
  ) {
    return this.service.listSuggestions(identity, productId);
  }

  @Get('suggestions/detail/:id')
  @ApiOperation({ summary: 'Detalhe de uma sugestão' })
  async getSuggestion(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
  ) {
    return this.service.getSuggestion(identity, id);
  }

  @Post('suggestions/:id/approve')
  @ApiOperation({ summary: 'Aprovar sugestão (aplica via ProductsService)' })
  async approveSuggestion(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @Body() dto: ApproveSuggestionDto,
  ) {
    return this.service.approveSuggestion(identity, id, dto);
  }

  @Post('suggestions/:id/reject')
  @ApiOperation({ summary: 'Rejeitar sugestão' })
  async rejectSuggestion(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @Body() dto: RejectSuggestionDto,
  ) {
    return this.service.rejectSuggestion(identity, id, dto);
  }

  @Post('suggestions/batch-approve')
  @ApiOperation({ summary: 'Aprovar múltiplas sugestões' })
  async batchApprove(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Body() dto: BatchApproveSuggestionsDto,
  ) {
    return this.service.batchApprove(identity, dto);
  }

  @Post('suggestions/batch-reject')
  @ApiOperation({ summary: 'Rejeitar múltiplas sugestões' })
  async batchReject(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Body() dto: BatchRejectSuggestionsDto,
  ) {
    return this.service.batchReject(identity, dto);
  }

  // ==================== FONTES ====================

  @Get('sources/:productId')
  @ApiOperation({ summary: 'Listar fontes associadas a um produto' })
  async listSources(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('productId') productId: string,
  ) {
    return this.service.listSources(identity, productId);
  }

  // ==================== PROMPTS SEED ====================

  @Post('prompts/seed')
  @ApiOperation({ summary: 'Criar prompts padrão para a organização' })
  async seedPrompts(@CurrentIdentity() identity: { orgId: string; userId?: string }) {
    await this.promptService.seedDefaultPrompts(identity);
    return { message: 'Prompts padrão criados com sucesso' };
  }

  // ==================== SEED MODELOS & ROTEAMENTO ====================

  @Post('models/seed')
  @ApiOperation({ summary: 'Criar modelos padrão (Ollama local) para a organização' })
  async seedModels(@CurrentIdentity() identity: { orgId: string; userId?: string }) {
    await this.service.seedDefaultModels(identity);
    return { message: 'Modelos padrão criados com sucesso' };
  }

  @Post('routing/seed')
  @ApiOperation({ summary: 'Criar roteamento padrão de modelos por task_type' })
  async seedRouting(@CurrentIdentity() identity: { orgId: string; userId?: string }) {
    await this.service.seedDefaultRouting(identity);
    return { message: 'Roteamento padrão criado com sucesso' };
  }

  @Post('seed/all')
  @ApiOperation({ summary: 'Criar todos os defaults: modelos, roteamento, prompts' })
  async seedAll(@CurrentIdentity() identity: { orgId: string; userId?: string }) {
    await this.service.seedAllDefaults(identity);
    return { message: 'Todos os defaults criados com sucesso' };
  }
}
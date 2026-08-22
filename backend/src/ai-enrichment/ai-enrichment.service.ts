import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DeepPartial } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';

import { AiModel } from './ai-model.entity';
import { AiModelRouting } from './ai-model-routing.entity';
import { AiPrompt } from './ai-prompt.entity';
import { AiJob, AIJobStatus, AITaskType } from './ai-job.entity';
import { AiSuggestion, AISuggestionStatus } from './ai-suggestion.entity';
import { AiSource, AISourceType } from './ai-source.entity';

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
import { ProductsService } from '../products/products.service';

type CurrentIdentity = { orgId: string; userId?: string };

@Injectable()
export class AiEnrichmentService {
  private readonly logger = new Logger(AiEnrichmentService.name);
  constructor(
    @InjectRepository(AiModel)
    private readonly aiModels: Repository<AiModel>,
    @InjectRepository(AiModelRouting)
    private readonly aiModelRouting: Repository<AiModelRouting>,
    @InjectRepository(AiPrompt)
    private readonly aiPrompts: Repository<AiPrompt>,
    @InjectRepository(AiJob)
    private readonly aiJobs: Repository<AiJob>,
    @InjectRepository(AiSuggestion)
    private readonly aiSuggestions: Repository<AiSuggestion>,
    @InjectRepository(AiSource)
    private readonly aiSources: Repository<AiSource>,
    @InjectQueue('ai-enrichment')
    private readonly enrichmentQueue: Queue,
    private readonly productsService: ProductsService,
  ) {}

  // ==================== MODELOS ====================

  async listModels(identity: CurrentIdentity): Promise<AiModel[]> {
    return this.aiModels.find({
      where: { organizationId: identity.orgId },
      order: { priority: 'ASC', name: 'ASC' },
    });
  }

  async createModel(identity: CurrentIdentity, dto: CreateAiModelDto): Promise<AiModel> {
    const model = this.aiModels.create({
      organizationId: identity.orgId,
      name: dto.name,
      provider: dto.provider,
      baseUrl: dto.baseUrl,
      apiKeyEncrypted: dto.apiKey ? this.encryptApiKey(dto.apiKey) : null,
      modelIdentifier: dto.modelIdentifier,
      capabilities: (dto.capabilities ?? {}) as Record<string, unknown>,
      contextWindow: dto.contextWindow ?? 4096,
      costPer1kInput: String(dto.costPer1kInput ?? 0),
      costPer1kOutput: String(dto.costPer1kOutput ?? 0),
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 1,
      config: dto.config ?? {},
    } as DeepPartial<AiModel>);
    return this.aiModels.save(model);
  }

  async updateModel(identity: CurrentIdentity, id: string, dto: UpdateAiModelDto): Promise<AiModel> {
    const model = await this.aiModels.findOne({
      where: { id, organizationId: identity.orgId },
    });
    if (!model) throw new NotFoundException('Modelo não encontrado');

    if (dto.name !== undefined) model.name = dto.name;
    if (dto.baseUrl !== undefined) model.baseUrl = dto.baseUrl;
    if (dto.apiKey !== undefined) model.apiKeyEncrypted = this.encryptApiKey(dto.apiKey);
    if (dto.modelIdentifier !== undefined) model.modelIdentifier = dto.modelIdentifier;
    if (dto.capabilities !== undefined) model.capabilities = dto.capabilities as Record<string, unknown>;
    if (dto.contextWindow !== undefined) model.contextWindow = dto.contextWindow;
    if (dto.costPer1kInput !== undefined) model.costPer1kInput = String(dto.costPer1kInput);
    if (dto.costPer1kOutput !== undefined) model.costPer1kOutput = String(dto.costPer1kOutput);
    if (dto.enabled !== undefined) model.enabled = dto.enabled;
    if (dto.priority !== undefined) model.priority = dto.priority;
    if (dto.config !== undefined) model.config = dto.config;

    return this.aiModels.save(model);
  }

  async deleteModel(identity: CurrentIdentity, id: string): Promise<{ id: string }> {
    const model = await this.aiModels.findOne({
      where: { id, organizationId: identity.orgId },
    });
    if (!model) throw new NotFoundException('Modelo não encontrado');
    await this.aiModels.delete(model.id);
    return { id: model.id };
  }

  // ==================== ROTEAMENTO ====================

  async listRouting(identity: CurrentIdentity): Promise<AiModelRouting[]> {
    return this.aiModelRouting.find({
      where: { organizationId: identity.orgId },
      order: { taskType: 'ASC' },
    });
  }

  async upsertRouting(identity: CurrentIdentity, dto: CreateAiModelRoutingDto): Promise<AiModelRouting> {
    let routing = await this.aiModelRouting.findOne({
      where: { organizationId: identity.orgId, taskType: dto.taskType },
    });
    if (!routing) {
      routing = this.aiModelRouting.create({
        organizationId: identity.orgId,
        taskType: dto.taskType,
      });
    }
    routing.requiredCapabilities = (dto.requiredCapabilities ?? {}) as Record<string, unknown>;
    routing.maxCostPer1k = dto.maxCostPer1k ? String(dto.maxCostPer1k) : '';
    routing.modelPriority = dto.modelPriority;
    routing.fallbackEnabled = dto.fallbackEnabled ?? true;
    return this.aiModelRouting.save(routing);
  }

  // ==================== PROMPTS ====================

  async listPrompts(identity: CurrentIdentity): Promise<AiPrompt[]> {
    return this.aiPrompts.find({
      where: { organizationId: identity.orgId, active: true },
      order: { name: 'ASC', version: 'DESC' },
    });
  }

  async createPrompt(identity: CurrentIdentity, dto: CreateAiPromptDto): Promise<AiPrompt> {
    // Buscar última versão para incrementar
    const latest = await this.aiPrompts.findOne({
      where: { organizationId: identity.orgId, name: dto.name },
      order: { version: 'DESC' },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const prompt = this.aiPrompts.create({
      organizationId: identity.orgId,
      name: dto.name,
      version: nextVersion,
      taskType: dto.taskType,
      systemPrompt: dto.systemPrompt,
      userPromptTemplate: dto.userPromptTemplate,
      outputSchema: dto.outputSchema,
      inputVariables: dto.inputVariables ?? [],
      description: dto.description,
      active: true,
      createdBy: identity.userId,
    });
    return this.aiPrompts.save(prompt);
  }

  async getLatestPrompt(identity: CurrentIdentity, name: string): Promise<AiPrompt | null> {
    return this.aiPrompts.findOne({
      where: { organizationId: identity.orgId, name, active: true },
      order: { version: 'DESC' },
    });
  }

  // ==================== JOBS ====================

  async createJob(identity: CurrentIdentity, dto: CreateAiJobDto): Promise<AiJob> {
    // Validar se produto existe (se informado)
    // TODO: validar productId se informado

    const job = this.aiJobs.create({
      organizationId: identity.orgId,
      productId: dto.productId ?? null,
      status: 'queued',
      taskType: dto.taskType,
      provider: '', // será preenchido pelo orchestrator
      modelId: dto.modelId ?? null,
      promptId: dto.promptId ?? null,
      inputSources: dto.inputSources,
      inputContext: dto.inputContext ?? {},
      createdBy: identity.userId,
    } as DeepPartial<AiJob>);

    const saved = await this.aiJobs.save(job);

    // Adicionar à queue
    await this.enrichmentQueue.add('process-enrichment', {
      jobId: saved.id,
      organizationId: identity.orgId,
    });

    return saved;
  }

  async listJobs(
    identity: CurrentIdentity,
    filters: { status?: AIJobStatus; productId?: string; taskType?: AITaskType; page?: number; perPage?: number } = {},
  ): Promise<{ data: AiJob[]; meta: { total: number; page: number; perPage: number; totalPages: number } }> {
    const { status, productId, taskType, page = 1, perPage = 20 } = filters;
    const qb = this.aiJobs
      .createQueryBuilder('job')
      .where('job.organizationId = :orgId', { orgId: identity.orgId });

    if (status) qb.andWhere('job.status = :status', { status });
    if (productId) qb.andWhere('job.productId = :productId', { productId });
    if (taskType) qb.andWhere('job.taskType = :taskType', { taskType });

    qb.orderBy('job.createdAt', 'DESC');

    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * perPage).take(perPage).getMany();

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getJob(identity: CurrentIdentity, id: string): Promise<AiJob> {
    const job = await this.aiJobs.findOne({
      where: { id, organizationId: identity.orgId },
      relations: ['model', 'prompt', 'product', 'sources', 'suggestions'],
    });
    if (!job) throw new NotFoundException('Job não encontrado');
    return job;
  }

  async retryJob(identity: CurrentIdentity, id: string): Promise<AiJob> {
    const job = await this.getJob(identity, id);
    if (job.status !== 'failed') {
      throw new BadRequestException('Apenas jobs falhos podem ser retentados');
    }

    job.status = 'queued';
    job.error = null as any;
    job.startedAt = null as any;
    job.completedAt = null as any;
    const saved = await this.aiJobs.save(job);

    await this.enrichmentQueue.add('process-enrichment', {
      jobId: saved.id,
      organizationId: identity.orgId,
    });

    return saved;
  }

  // ==================== SUGESTÕES ====================

  async listSuggestions(identity: CurrentIdentity, productId: string): Promise<AiSuggestion[]> {
    return this.aiSuggestions.find({
      where: { productId, organizationId: identity.orgId },
      relations: ['source', 'model', 'job'],
      order: { createdAt: 'DESC' },
    });
  }

  async getSuggestion(identity: CurrentIdentity, id: string): Promise<AiSuggestion> {
    const suggestion = await this.aiSuggestions.findOne({
      where: { id, organizationId: identity.orgId },
      relations: ['source', 'model', 'job', 'product'],
    });
    if (!suggestion) throw new NotFoundException('Sugestão não encontrada');
    return suggestion;
  }

  async approveSuggestion(identity: CurrentIdentity, id: string, dto: ApproveSuggestionDto): Promise<AiSuggestion> {
    const suggestion = await this.getSuggestion(identity, id);
    if (suggestion.status !== 'pending' && suggestion.status !== 'conflict') {
      throw new BadRequestException('Apenas sugestões pendentes ou em conflito podem ser aprovadas');
    }

    suggestion.status = 'approved';
    suggestion.reviewedBy = identity.userId ?? 'system';
    suggestion.reviewedAt = new Date();
    suggestion.reviewNote = dto.reviewNote ?? '';

    await this.aiSuggestions.save(suggestion);

    if (suggestion.productId) {
      await this.applySuggestionToProduct(identity, suggestion);
    }

    return suggestion;
  }

  private async applySuggestionToProduct(identity: CurrentIdentity, suggestion: any) {
    try {
      const product = await this.productsService.findOne(identity.orgId, suggestion.productId);
      if (!product) return;

      const field = suggestion.fieldPath;
      const value = suggestion.suggestedValue;

      if (['nome', 'descricao', 'ean_gtin', 'ncm', 'cest', 'custo', 'status',
           'peso_bruto_kg', 'peso_liquido_kg', 'altura_cm', 'largura_cm', 'profundidade_cm',
           'unidade_venda', 'data_lancamento', 'brand_id', 'manufacturer_id', 'category_id'].includes(field)) {
        const dto: any = { [field]: value };
        await this.productsService.update(identity.orgId, suggestion.productId, dto, identity.userId);
      }

      this.logger.log(`Sugestão ${suggestion.id} aplicada ao produto ${suggestion.productId}: ${field} = ${JSON.stringify(value)}`);
    } catch (error: any) {
      this.logger.error(`Erro ao aplicar sugestão ${suggestion.id} ao produto: ${error.message}`);
    }
  }

  async rejectSuggestion(identity: CurrentIdentity, id: string, dto: RejectSuggestionDto): Promise<AiSuggestion> {
    const suggestion = await this.getSuggestion(identity, id);
    if (suggestion.status !== 'pending' && suggestion.status !== 'conflict') {
      throw new BadRequestException('Apenas sugestões pendentes ou em conflito podem ser rejeitadas');
    }

    suggestion.status = 'rejected';
    suggestion.reviewedBy = identity.userId ?? 'system';
    suggestion.reviewedAt = new Date();
    suggestion.reviewNote = dto.reviewNote ?? '';

    return this.aiSuggestions.save(suggestion);
  }

  async batchApprove(identity: CurrentIdentity, dto: BatchApproveSuggestionsDto): Promise<AiSuggestion[]> {
    const suggestions = await this.aiSuggestions.find({
      where: { id: In(dto.ids), organizationId: identity.orgId },
    });
    const userId = identity.userId ?? 'system';
    for (const s of suggestions) {
      if (s.status === 'pending' || s.status === 'conflict') {
        s.status = 'approved';
        s.reviewedBy = userId;
        s.reviewedAt = new Date();
        await this.aiSuggestions.save(s);
        if (s.productId) {
          await this.applySuggestionToProduct(identity, s);
        }
      }
    }
    return this.aiSuggestions.find({ where: { id: In(dto.ids), organizationId: identity.orgId } });
  }

  async batchReject(identity: CurrentIdentity, dto: BatchRejectSuggestionsDto): Promise<AiSuggestion[]> {
    const suggestions = await this.aiSuggestions.find({
      where: { id: In(dto.ids), organizationId: identity.orgId },
    });
    const userId = identity.userId ?? 'system';
    for (const s of suggestions) {
      if (s.status === 'pending' || s.status === 'conflict') {
        s.status = 'rejected';
        s.reviewedBy = userId;
        s.reviewedAt = new Date();
      }
    }
    return this.aiSuggestions.save(suggestions);
  }

  // ==================== FONTES ====================

  async listSources(identity: CurrentIdentity, productId: string): Promise<AiSource[]> {
    return this.aiSources.find({
      where: {
        organizationId: identity.orgId,
        job: { productId } as any,
      },
      relations: ['job'],
    });
  }

  // ==================== UTILITÁRIOS ====================

  private encryptApiKey(key: string): string {
    // TODO: implementar criptografia real com pgcrypto
    // Por enquanto, placeholder
    return `enc:${Buffer.from(key).toString('base64')}`;
  }

  private decryptApiKey(encrypted: string): string {
    if (!encrypted?.startsWith('enc:')) return encrypted;
    return Buffer.from(encrypted.slice(4), 'base64').toString();
  }

  // ==================== SEED DEFAULTS ====================

  async seedDefaultModels(identity: CurrentIdentity): Promise<void> {
    const defaultModels = [
      {
        name: 'qwen2.5-7b-local',
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        modelIdentifier: 'qwen2.5:7b',
        capabilities: { structured_output: true, vision: false, function_calling: false },
        contextWindow: 32768,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        enabled: true,
        priority: 1,
        config: { temperature: 0.1, top_p: 0.9 },
      },
      {
        name: 'qwen2.5-14b-local',
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        modelIdentifier: 'qwen2.5:14b',
        capabilities: { structured_output: true, vision: false, function_calling: false },
        contextWindow: 32768,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        enabled: true,
        priority: 2,
        config: { temperature: 0.1, top_p: 0.9 },
      },
      {
        name: 'llama3.2-vision-local',
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        modelIdentifier: 'llama3.2-vision:11b',
        capabilities: { structured_output: true, vision: true, function_calling: false },
        contextWindow: 16384,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        enabled: true,
        priority: 1,
        config: { temperature: 0.1, top_p: 0.9 },
      },
      {
        name: 'llama3.1-8b-instruct-local',
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        modelIdentifier: 'llama3.1:8b-instruct',
        capabilities: { structured_output: true, vision: false, function_calling: true },
        contextWindow: 131072,
        costPer1kInput: 0,
        costPer1kOutput: 0,
        enabled: true,
        priority: 1,
        config: { temperature: 0.3, top_p: 0.9 },
      },
    ];

    for (const model of defaultModels) {
      const existing = await this.aiModels.findOne({
        where: { organizationId: identity.orgId, name: model.name },
      });
      if (!existing) {
        await this.aiModels.save(
          this.aiModels.create({
            organizationId: identity.orgId,
            name: model.name,
            provider: model.provider,
            baseUrl: model.baseUrl,
            modelIdentifier: model.modelIdentifier,
            capabilities: model.capabilities as Record<string, unknown>,
            contextWindow: model.contextWindow,
            costPer1kInput: String(model.costPer1kInput),
            costPer1kOutput: String(model.costPer1kOutput),
            enabled: model.enabled,
            priority: model.priority,
            config: model.config as Record<string, unknown>,
          }),
        );
        this.logger.log(`Modelo padrão criado: ${model.name}`);
      }
    }
  }

  async seedDefaultRouting(identity: CurrentIdentity): Promise<void> {
    // Garantir que modelos existem
    await this.seedDefaultModels(identity);

    const models = await this.aiModels.find({
      where: { organizationId: identity.orgId },
    });
    const modelMap = new Map(models.map(m => [m.name, m.id]));

    const defaultRouting = [
      { taskType: 'classification', modelName: 'qwen2.5-7b-local' },
      { taskType: 'extraction', modelName: 'qwen2.5-14b-local' },
      { taskType: 'vision', modelName: 'llama3.2-vision-local' },
      { taskType: 'generation', modelName: 'llama3.1-8b-instruct-local' },
      { taskType: 'readiness', modelName: 'llama3.1-8b-instruct-local' },
    ];

    for (const routing of defaultRouting) {
      const modelId = modelMap.get(routing.modelName);
      if (!modelId) continue;

      const existing = await this.aiModelRouting.findOne({
        where: { organizationId: identity.orgId, taskType: routing.taskType },
      });
      if (!existing) {
        await this.aiModelRouting.save(
          this.aiModelRouting.create({
            organizationId: identity.orgId,
            taskType: routing.taskType,
            requiredCapabilities: { structured_output: true },
            modelPriority: [modelId],
            fallbackEnabled: true,
          }),
        );
        this.logger.log(`Roteamento padrão criado: ${routing.taskType} -> ${routing.modelName}`);
      }
    }
  }

  async seedAllDefaults(identity: CurrentIdentity, promptService?: any): Promise<void> {
    await this.seedDefaultModels(identity);
    await this.seedDefaultRouting(identity);
    if (promptService) {
      await promptService.seedDefaultPrompts(identity);
    }
  }
}
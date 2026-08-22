import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

import { AiJob } from './ai-job.entity';
import { AiModel } from './ai-model.entity';
import { AiPrompt } from './ai-prompt.entity';
import { AiSuggestion } from './ai-suggestion.entity';
import { AiSource } from './ai-source.entity';
import { AiModelRouting } from './ai-model-routing.entity';

import { AiProviderAdapterService } from './ai-provider-adapter.service';
import { AiIngestionService } from './ai-ingestion.service';

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(
    @InjectRepository(AiJob)
    private readonly aiJobs: Repository<AiJob>,
    @InjectRepository(AiSuggestion)
    private readonly aiSuggestions: Repository<AiSuggestion>,
    @InjectRepository(AiSource)
    private readonly aiSources: Repository<AiSource>,
    @InjectRepository(AiModel)
    private readonly aiModels: Repository<AiModel>,
    @InjectRepository(AiModelRouting)
    private readonly aiModelRouting: Repository<AiModelRouting>,
    @InjectRepository(AiPrompt)
    private readonly aiPrompts: Repository<AiPrompt>,
    @InjectQueue('ai-enrichment')
    private readonly enrichmentQueue: Queue,
    private readonly providerAdapter: AiProviderAdapterService,
    private readonly ingestionService: AiIngestionService,
  ) {}

  async processJob(job: Job) {
    const { jobId, organizationId } = job.data;
    this.logger.log(`Processando job ${jobId} para org ${organizationId}`);

    const aiJob = await this.aiJobs.findOne({
      where: { id: jobId, organizationId } as any,
      relations: ['model', 'prompt', 'product', 'sources'],
    });

    if (!aiJob) {
      this.logger.error(`Job ${jobId} não encontrado`);
      return;
    }

    try {
      (aiJob as any).status = 'processing';
      (aiJob as any).startedAt = new Date();
      await this.aiJobs.save(aiJob);

      const processedSources = await this.processSources(aiJob as any);
      const { model, prompt } = await this.resolveModelAndPrompt(aiJob as any, organizationId);
      const result = await this.executeLLM(aiJob as any, model, prompt, processedSources);
      await this.validateAndStructureOutput(result, aiJob as any, prompt);
      const suggestions = await this.createSuggestions(aiJob as any, result.structured, processedSources, model);
      await this.detectConflicts(suggestions);

      (aiJob as any).status = suggestions.some((s: any) => s.status === 'pending') ? 'review_required' : 'completed';
      (aiJob as any).outputStructured = result.structured;
      (aiJob as any).outputRaw = result.raw;
      (aiJob as any).confidenceAvg = this.calculateAvgConfidence(suggestions);
      (aiJob as any).tokensInput = result.tokensInput;
      (aiJob as any).tokensOutput = result.tokensOutput;
      (aiJob as any).costEstimate = String(this.calculateCost(result, model));
      (aiJob as any).completedAt = new Date();
      await this.aiJobs.save(aiJob);

      this.logger.log(`Job ${jobId} concluído com ${suggestions.length} sugestões`);
    } catch (error: any) {
      this.logger.error(`Erro no job ${jobId}: ${error.message}`, error.stack);
      const failedJob = await this.aiJobs.findOne({ where: { id: job.data.jobId } as any });
      if (failedJob) {
        (failedJob as any).status = 'failed';
        (failedJob as any).error = error.message;
        (failedJob as any).completedAt = new Date();
        await this.aiJobs.save(failedJob);
      }
    }
  }

  private async processSources(aiJob: any) {
    const sources: any[] = [];
    for (const src of aiJob.inputSources) {
      const source = await this.createSourceRecord(aiJob, src);
      let extractedText = '';

      switch (src.type) {
        case 'pdf':
          extractedText = await this.ingestionService.extractFromPDF(src.storage_path);
          break;
        case 'image':
          extractedText = await this.ingestionService.extractFromImage(src.url || src.storage_path);
          break;
        case 'csv':
          extractedText = await this.ingestionService.extractFromCSV(src.storage_path);
          break;
        case 'xlsx':
          extractedText = await this.ingestionService.extractFromXLSX(src.storage_path);
          break;
        case 'url':
          extractedText = await this.ingestionService.extractFromURL(src.url);
          break;
        case 'text':
          extractedText = src.content ?? '';
          break;
      }

      source.extractedText = extractedText;
      await this.aiSources.save(source);
      sources.push({ ...source, extractedText });
    }
    return sources;
  }

  private async createSourceRecord(aiJob: any, src: any) {
    const source = this.aiSources.create({
      organizationId: aiJob.organizationId,
      jobId: aiJob.id,
      type: src.type,
      originalFilename: src.original_filename,
      storagePath: src.storage_path,
      mimeType: src.mime_type,
      pageNumbers: src.pages,
      metadata: src.metadata ?? {},
    });
    return this.aiSources.save(source);
  }

  private async resolveModelAndPrompt(aiJob: any, organizationId: string) {
    let model: AiModel | null = null;

    if (aiJob.modelId) {
      model = await this.aiModels.findOne({ where: { id: aiJob.modelId, organizationId } });
    }

    if (!model) {
      const routing = await this.aiModelRouting.findOne({
        where: { organizationId, taskType: aiJob.taskType } as any,
      });
      if (routing && routing.modelPriority.length > 0) {
        model = await this.aiModels.findOne({
          where: { id: routing.modelPriority[0], organizationId, enabled: true } as any,
        });
      }
    }

    if (!model) {
      model = await this.aiModels.findOne({
        where: { organizationId, enabled: true } as any,
        order: { priority: 'ASC' } as any,
      });
    }

    if (!model) {
      throw new Error('Nenhum modelo de IA disponível para esta organização');
    }

    let prompt: AiPrompt | null = null;
    if (aiJob.promptId) {
      prompt = await this.aiPrompts.findOne({ where: { id: aiJob.promptId } as any });
    }

    if (!prompt) {
      prompt = await this.aiPrompts.findOne({
        where: { organizationId, taskType: aiJob.taskType, active: true } as any,
        order: { version: 'DESC' } as any,
      });
    }

    return { model, prompt };
  }

  private async executeLLM(aiJob: any, model: AiModel, prompt: AiPrompt | null, sources: any[]) {
    const context = {
      taskType: aiJob.taskType,
      product: aiJob.product,
      inputContext: aiJob.inputContext,
      sources: sources.map((s: any) => ({ type: s.type, text: s.extractedText, metadata: s.metadata })),
      attributesSchema: aiJob.inputContext?.attributes_schema ?? [],
    };

    const p = prompt as any;
    return this.providerAdapter.generate({
      model,
      prompt: {
        system: p?.systemPrompt ?? 'You are a product data extraction assistant.',
        template: p?.userPromptTemplate ?? 'Extract product information from the provided sources.',
        outputSchema: p?.outputSchema ?? {},
      },
      context,
    });
  }

  private async validateAndStructureOutput(result: any, aiJob: any, prompt: AiPrompt | null) {
    return result;
  }

  private async createSuggestions(aiJob: any, output: any, sources: any[], model: AiModel) {
    const suggestions: any[] = [];

    for (const [fieldPath, fieldData] of Object.entries(output)) {
      if (!fieldData || typeof fieldData !== 'object') continue;

      const { value, confidence, source_ids } = fieldData as any;
      if (value === undefined || value === null) continue;

      const suggestion = this.aiSuggestions.create({
        organizationId: aiJob.organizationId,
        jobId: aiJob.id,
        productId: aiJob.productId,
        fieldPath,
        fieldType: this.inferFieldType(fieldPath),
        currentValue: null,
        suggestedValue: value,
        confidence: String(confidence ?? 0.8),
        sourceId: source_ids?.[0] ?? sources[0]?.id,
        allSources: source_ids?.map((id: string) => sources.find((s: any) => s.id === id)) ?? sources,
        modelId: model?.id,
        promptVersion: (aiJob.prompt as any)?.version,
        extractionMethod: sources[0]?.type,
        status: 'pending',
      } as any);

      const saved = await this.aiSuggestions.save(suggestion);
      suggestions.push(saved);
    }

    return suggestions;
  }

  private inferFieldType(fieldPath: string): string {
    if (fieldPath.startsWith('variants[')) return 'variant_field';
    if (fieldPath.startsWith('attributes.')) return 'attribute';
    if (['description', 'short_description', 'bullets', 'seo_title', 'seo_description'].includes(fieldPath)) {
      return 'generated_content';
    }
    return 'product_field';
  }

  private async detectConflicts(suggestions: any[]) {
    const groups = new Map<string, any[]>();
    for (const s of suggestions) {
      if (!groups.has(s.fieldPath)) groups.set(s.fieldPath, []);
      groups.get(s.fieldPath)!.push(s);
    }

    for (const [, group] of groups) {
      if (group.length > 1) {
        const uniqueValues = new Set(group.map((g: any) => JSON.stringify(g.suggestedValue)));
        if (uniqueValues.size > 1) {
          for (const s of group) {
            s.status = 'conflict';
            await this.aiSuggestions.save(s);
          }
        }
      }
    }
  }

  private calculateAvgConfidence(suggestions: any[]): string {
    if (suggestions.length === 0) return '0';
    const sum = suggestions.reduce((acc: number, s: any) => acc + Number(s.confidence), 0);
    return (sum / suggestions.length).toFixed(4);
  }

  private calculateCost(result: any, model: AiModel): number {
    if (!model) return 0;
    const inputCost = (result.tokensInput / 1000) * Number(model.costPer1kInput ?? 0);
    const outputCost = (result.tokensOutput / 1000) * Number(model.costPer1kOutput ?? 0);
    return inputCost + outputCost;
  }
}

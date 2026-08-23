import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AiModel } from './ai-model.entity';
import { AiModelRouting } from './ai-model-routing.entity';
import { AiPrompt } from './ai-prompt.entity';
import { AiJob } from './ai-job.entity';
import { AiSuggestion } from './ai-suggestion.entity';
import { AiSource } from './ai-source.entity';
import { AiEnrichmentController } from './ai-enrichment.controller';
import { AiEnrichmentService } from './ai-enrichment.service';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { AiProviderAdapterService } from './ai-provider-adapter.service';
import { AiIngestionService } from './ai-ingestion.service';
import { AiPromptService } from './ai-prompt.service';
import { AiEnrichmentProcessor } from './ai-enrichment.processor';
import { ProductsModule } from '../products/products.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { MlMonitorModule } from '../ml-monitor/ml-monitor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiModel,
      AiModelRouting,
      AiPrompt,
      AiJob,
      AiSuggestion,
      AiSource,
    ]),
    BullModule.registerQueue({
      name: 'ai-enrichment',
    }),
    ProductsModule,
    WebhooksModule,
    MlMonitorModule,
  ],
  controllers: [AiEnrichmentController],
  providers: [
    AiEnrichmentService,
    AiOrchestratorService,
    AiProviderAdapterService,
    AiIngestionService,
    AiPromptService,
    AiEnrichmentProcessor,
  ],
  exports: [
    AiEnrichmentService,
    AiOrchestratorService,
    AiProviderAdapterService,
    AiIngestionService,
    AiPromptService,
  ],
})
export class AiEnrichmentModule {}

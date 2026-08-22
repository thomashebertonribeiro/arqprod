import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiOrchestratorService } from './ai-orchestrator.service';

@Processor('ai-enrichment')
export class AiEnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(AiEnrichmentProcessor.name);

  constructor(private readonly orchestrator: AiOrchestratorService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Iniciando processamento do job ${job.id}`);
    await this.orchestrator.processJob(job);
    return { success: true };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completado com sucesso`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} falhou: ${error.message}`);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    this.logger.debug(`Job ${job.id} progresso: ${progress}%`);
  }
}
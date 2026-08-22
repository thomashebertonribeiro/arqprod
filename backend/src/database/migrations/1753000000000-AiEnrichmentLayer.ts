import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiEnrichmentLayer1753000000000 implements MigrationInterface {
  name = 'AiEnrichmentLayer1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "ai_models" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "provider" character varying(50) NOT NULL, "base_url" text, "api_key_encrypted" text, "model_identifier" character varying(200) NOT NULL, "capabilities" jsonb NOT NULL DEFAULT '{}', "context_window" integer NOT NULL DEFAULT 4096, "cost_per_1k_input" numeric(10,6) NOT NULL DEFAULT 0, "cost_per_1k_output" numeric(10,6) NOT NULL DEFAULT 0, "enabled" boolean NOT NULL DEFAULT true, "priority" integer NOT NULL DEFAULT 1, "config" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ai_models" PRIMARY KEY ("id"), CONSTRAINT "UQ_ai_model_org_name" UNIQUE ("organization_id", "name"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_models" ADD CONSTRAINT "FK_ai_model_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_models_org_enabled" ON "ai_models" ("organization_id", "enabled")`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "ai_model_routing" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "task_type" character varying(50) NOT NULL, "required_capabilities" jsonb NOT NULL DEFAULT '{}', "max_cost_per_1k" numeric(10,6), "model_priority" uuid[] NOT NULL, "fallback_enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ai_model_routing" PRIMARY KEY ("id"), CONSTRAINT "UQ_ai_model_routing_org_task" UNIQUE ("organization_id", "task_type"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_model_routing" ADD CONSTRAINT "FK_ai_model_routing_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "ai_prompts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "version" integer NOT NULL DEFAULT 1, "task_type" character varying(50) NOT NULL, "system_prompt" text NOT NULL, "user_prompt_template" text NOT NULL, "output_schema" jsonb NOT NULL, "input_variables" jsonb NOT NULL DEFAULT '[]', "description" text, "active" boolean NOT NULL DEFAULT true, "created_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ai_prompts" PRIMARY KEY ("id"), CONSTRAINT "UQ_ai_prompt_org_name_version" UNIQUE ("organization_id", "name", "version"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_prompts" ADD CONSTRAINT "FK_ai_prompt_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_prompts" ADD CONSTRAINT "FK_ai_prompt_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_prompts_org_active" ON "ai_prompts" ("organization_id", "active")`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "ai_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "product_id" uuid, "status" character varying(30) NOT NULL DEFAULT 'queued', "task_type" character varying(50) NOT NULL, "provider" character varying(50) NOT NULL, "model_id" uuid, "prompt_id" uuid, "input_sources" jsonb NOT NULL DEFAULT '[]', "input_context" jsonb NOT NULL DEFAULT '{}', "output_structured" jsonb, "output_raw" text, "confidence_avg" numeric(5,4), "tokens_input" integer NOT NULL DEFAULT 0, "tokens_output" integer NOT NULL DEFAULT 0, "cost_estimate" numeric(10,6) NOT NULL DEFAULT 0, "error" text, "started_at" TIMESTAMP, "completed_at" TIMESTAMP, "created_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ai_jobs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_jobs" ADD CONSTRAINT "FK_ai_job_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_jobs" ADD CONSTRAINT "FK_ai_job_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_jobs" ADD CONSTRAINT "FK_ai_job_model" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_jobs" ADD CONSTRAINT "FK_ai_job_prompt" FOREIGN KEY ("prompt_id") REFERENCES "ai_prompts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_jobs" ADD CONSTRAINT "FK_ai_job_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_jobs_org" ON "ai_jobs" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_jobs_product" ON "ai_jobs" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_jobs_status" ON "ai_jobs" ("status")`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "ai_suggestions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "job_id" uuid NOT NULL, "product_id" uuid NOT NULL, "field_path" character varying(200) NOT NULL, "field_type" character varying(50) NOT NULL, "current_value" jsonb, "suggested_value" jsonb NOT NULL, "confidence" numeric(5,4) NOT NULL, "source_id" uuid, "all_sources" jsonb NOT NULL DEFAULT '[]', "model_id" uuid, "prompt_version" integer, "extraction_method" character varying(50), "status" character varying(20) NOT NULL DEFAULT 'pending', "reviewed_by" uuid, "reviewed_at" TIMESTAMP, "review_note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ai_suggestions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_suggestions" ADD CONSTRAINT "FK_ai_suggestion_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_suggestions" ADD CONSTRAINT "FK_ai_suggestion_job" FOREIGN KEY ("job_id") REFERENCES "ai_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_suggestions" ADD CONSTRAINT "FK_ai_suggestion_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_suggestions" ADD CONSTRAINT "FK_ai_suggestion_source" FOREIGN KEY ("source_id") REFERENCES "ai_sources"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_suggestions" ADD CONSTRAINT "FK_ai_suggestion_model" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_suggestions" ADD CONSTRAINT "FK_ai_suggestion_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_suggestions_product" ON "ai_suggestions" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_suggestions_job" ON "ai_suggestions" ("job_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_suggestions_status" ON "ai_suggestions" ("status")`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "ai_sources" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "job_id" uuid NOT NULL, "type" character varying(30) NOT NULL, "original_filename" character varying(300), "storage_path" text, "mime_type" character varying(100), "page_numbers" integer[], "extracted_text" text, "metadata" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ai_sources" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_sources" ADD CONSTRAINT "FK_ai_source_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_sources" ADD CONSTRAINT "FK_ai_source_job" FOREIGN KEY ("job_id") REFERENCES "ai_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_sources_job" ON "ai_sources" ("job_id")`,
    );

    await queryRunner.query(
      `INSERT INTO arqprod_migrations (timestamp, name) VALUES (1753000000000, 'AiEnrichmentLayer1753000000000') ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_sources_job"`);
    await queryRunner.query(`ALTER TABLE "ai_sources" DROP CONSTRAINT IF EXISTS "FK_ai_source_job"`);
    await queryRunner.query(`ALTER TABLE "ai_sources" DROP CONSTRAINT IF EXISTS "FK_ai_source_org"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_sources"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_suggestions_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_suggestions_job"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_suggestions_product"`);
    await queryRunner.query(`ALTER TABLE "ai_suggestions" DROP CONSTRAINT IF EXISTS "FK_ai_suggestion_reviewed_by"`);
    await queryRunner.query(`ALTER TABLE "ai_suggestions" DROP CONSTRAINT IF EXISTS "FK_ai_suggestion_model"`);
    await queryRunner.query(`ALTER TABLE "ai_suggestions" DROP CONSTRAINT IF EXISTS "FK_ai_suggestion_source"`);
    await queryRunner.query(`ALTER TABLE "ai_suggestions" DROP CONSTRAINT IF EXISTS "FK_ai_suggestion_product"`);
    await queryRunner.query(`ALTER TABLE "ai_suggestions" DROP CONSTRAINT IF EXISTS "FK_ai_suggestion_job"`);
    await queryRunner.query(`ALTER TABLE "ai_suggestions" DROP CONSTRAINT IF EXISTS "FK_ai_suggestion_org"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_suggestions"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_jobs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_jobs_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_jobs_org"`);
    await queryRunner.query(`ALTER TABLE "ai_jobs" DROP CONSTRAINT IF EXISTS "FK_ai_job_created_by"`);
    await queryRunner.query(`ALTER TABLE "ai_jobs" DROP CONSTRAINT IF EXISTS "FK_ai_job_prompt"`);
    await queryRunner.query(`ALTER TABLE "ai_jobs" DROP CONSTRAINT IF EXISTS "FK_ai_job_model"`);
    await queryRunner.query(`ALTER TABLE "ai_jobs" DROP CONSTRAINT IF EXISTS "FK_ai_job_product"`);
    await queryRunner.query(`ALTER TABLE "ai_jobs" DROP CONSTRAINT IF EXISTS "FK_ai_job_org"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_jobs"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_prompts_org_active"`);
    await queryRunner.query(`ALTER TABLE "ai_prompts" DROP CONSTRAINT IF EXISTS "FK_ai_prompt_created_by"`);
    await queryRunner.query(`ALTER TABLE "ai_prompts" DROP CONSTRAINT IF EXISTS "FK_ai_prompt_org"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_prompts"`);

    await queryRunner.query(`ALTER TABLE "ai_model_routing" DROP CONSTRAINT IF EXISTS "FK_ai_model_routing_org"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_model_routing"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_models_org_enabled"`);
    await queryRunner.query(`ALTER TABLE "ai_models" DROP CONSTRAINT IF EXISTS "FK_ai_model_org"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_models"`);
  }
}
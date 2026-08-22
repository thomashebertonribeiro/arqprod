import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentIdentity } from '../common/auth/current-identity.decorator';

import { AiPrompt } from './ai-prompt.entity';

@Injectable()
export class AiPromptService {
  private readonly logger = new Logger(AiPromptService.name);

  constructor(
    @InjectRepository(AiPrompt)
    private readonly aiPrompts: Repository<AiPrompt>,
  ) {}

  async seedDefaultPrompts(identity: { orgId: string; userId?: string }): Promise<void> {
    const defaultPrompts = [
      this.getExtractionPrompt(identity),
      this.getClassificationPrompt(identity),
      this.getVisionPrompt(identity),
      this.getGenerationPrompt(identity),
      this.getReadinessPrompt(identity),
    ];

    for (const prompt of defaultPrompts) {
      const existing = await this.aiPrompts.findOne({
        where: { organizationId: identity.orgId, name: prompt.name, active: true },
        order: { version: 'DESC' },
      });

      if (!existing) {
        await this.aiPrompts.save(
          this.aiPrompts.create({
            organizationId: identity.orgId,
            ...prompt,
            createdBy: identity.userId,
          }),
        );
        this.logger.log(`Prompt padrão criado: ${prompt.name} v${prompt.version}`);
      }
    }
  }

  private getExtractionPrompt(identity: { orgId: string; userId?: string }): Partial<any> {
    return {
      name: 'product_extraction',
      version: 1,
      taskType: 'extraction',
      systemPrompt: `Você é um especialista em extração de dados de produtos para sistemas PIM (Product Information Management).

Sua tarefa é extrair informações estruturadas de produtos a partir de fontes não estruturadas (PDFs, imagens, CSVs, URLs, textos).

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS JSON válido conforme o schema fornecido
2. Para cada campo extraído, inclua: value, confidence (0-1), source_ids (array de IDs das fontes)
3. Se a informação não estiver disponível, retorne null para o value e 0 para confidence
4. NÃO invente informações - apenas extraia o que está explícito nas fontes
5. Normalize unidades: peso em kg, dimensões em cm, preços em decimal
6. Para listas (cores, materiais), retorne array de strings
7. Datas no formato ISO 8601 (YYYY-MM-DD)`,
      userPromptTemplate: `FONTES DE INFORMAÇÃO:
{{sources}}

PRODUTO EXISTENTE (se houver):
{{product}}

CONTEXTO ADICIONAL:
{{inputContext}}

ATRIBUTOS DISPONÍVEIS NA CATEGORIA:
{{attributesSchema}}

Extraia TODOS os atributos relevantes do produto. Para cada atributo, retorne:
- value: valor extraído (ou null)
- confidence: 0.0 a 1.0
- source_ids: array de IDs das fontes que sustentam esta extração

Retorne APENAS o JSON estruturado.`,
      outputSchema: {
        type: 'object',
        properties: {
          nome: { type: 'object', properties: { value: { type: ['string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          sku_base: { type: 'object', properties: { value: { type: ['string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          ean_gtin: { type: 'object', properties: { value: { type: ['string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          ncm: { type: 'object', properties: { value: { type: ['string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          cest: { type: 'object', properties: { value: { type: ['string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          custo: { type: 'object', properties: { value: { type: ['number', 'string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          descricao: { type: 'object', properties: { value: { type: ['string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          marca: { type: 'object', properties: { value: { type: ['string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          fabricante: { type: 'object', properties: { value: { type: ['string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          unidade_venda: { type: 'object', properties: { value: { type: ['string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          data_lancamento: { type: 'object', properties: { value: { type: ['string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          peso_bruto_kg: { type: 'object', properties: { value: { type: ['number', 'string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          peso_liquido_kg: { type: 'object', properties: { value: { type: ['number', 'string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          altura_cm: { type: 'object', properties: { value: { type: ['number', 'string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          largura_cm: { type: 'object', properties: { value: { type: ['number', 'string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          profundidade_cm: { type: 'object', properties: { value: { type: ['number', 'string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          categoria_sugerida: { type: 'object', properties: { value: { type: ['string', 'null'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          atributos: {
            type: 'object',
            properties: {
              value: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    chave: { type: 'string' },
                    valor: { type: ['string', 'number', 'boolean', 'null'] },
                    confidence: { type: 'number' },
                    source_ids: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['chave', 'valor', 'confidence', 'source_ids']
                }
              },
              confidence: { type: 'number' },
              source_ids: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        required: []
      },
      inputVariables: ['sources', 'product', 'inputContext', 'attributesSchema'],
      description: 'Extração completa de atributos de produto a partir de fontes não estruturadas',
    };
  }

  private getClassificationPrompt(identity: { orgId: string; userId?: string }): Partial<any> {
    return {
      name: 'product_classification',
      version: 1,
      taskType: 'classification',
      systemPrompt: `Você é um especialista em classificação de produtos para e-commerce e PIM.

Sua tarefa é classificar um produto na categoria mais adequada e identificar quais atributos são relevantes.

REGRAS:
1. Retorne APENAS JSON válido
2. Confidence baseada na clareza das informações nas fontes
3. Sugira categoria existente ou nova se não houver match
4. Liste atributos obrigatórios e recomendados para a categoria`,
      userPromptTemplate: `FONTES:
{{sources}}

PRODUTO EXISTENTE:
{{product}}

ATRIBUTOS EXISTENTES:
{{attributesSchema}}

CATEGORIAS DISPONÍVEIS:
{{categories}}

Classifique o produto e retorne:
{
  "categoria_sugerida": { "value": "nome_da_categoria", "confidence": 0.9, "source_ids": ["src1"] },
  "categoria_nova": { "value": "sugestao_se_nao_existir", "confidence": 0.7, "source_ids": ["src1"] },
  "atributos_obrigatorios": ["atributo1", "atributo2"],
  "atributos_recomendados": ["atributo3", "atributo4"],
  "raciocinio": "Explicação breve da classificação"
}`,
      outputSchema: {
        type: 'object',
        properties: {
          categoria_sugerida: { type: 'object', properties: { value: { type: 'string' }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          categoria_nova: { type: 'object', properties: { value: { type: 'string' }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          atributos_obrigatorios: { type: 'array', items: { type: 'string' } },
          atributos_recomendados: { type: 'array', items: { type: 'string' } },
          raciocinio: { type: 'string' }
        },
        required: ['categoria_sugerida', 'atributos_obrigatorios', 'atributos_recomendados', 'raciocinio']
      },
      inputVariables: ['sources', 'product', 'attributesSchema', 'categories'],
      description: 'Classificação de produto e sugestão de atributos por categoria',
    };
  }

  private getVisionPrompt(identity: { orgId: string; userId?: string }): Partial<any> {
    return {
      name: 'product_vision_analysis',
      version: 1,
      taskType: 'vision',
      systemPrompt: `Você é um modelo de visão computacional especializado em análise de produtos físicos.

Analise a(s) imagem(ns) do produto e extraia informações visuais.

FOCO:
- Identificar tipo de produto
- Cores predominantes
- Materiais aparentes
- Formato/dimensões aproximadas
- Texturas
- Embalagem
- Etiquetas/códigos visíveis
- Estado do produto (novo, usado, danificado)

REGRAS:
1. Seja conservador - só reporte o que é claramente visível
2. Confidence baseada na qualidade da imagem e clareza visual
2. Se não for possível determinar, retorne null com confidence 0`,
      userPromptTemplate: `IMAGENS DO PRODUTO:
{{sources}}

CONTEXTO:
{{inputContext}}

Analise as imagens e retorne:
{
  "tipo_produto": { "value": "tipo", "confidence": 0.9, "source_ids": ["img1"] },
  "cores": { "value": ["cor1", "cor2"], "confidence": 0.85, "source_ids": ["img1"] },
  "material_aparente": { "value": "material", "confidence": 0.8, "source_ids": ["img1"] },
  "dimensoes_estimadas": { "value": { "altura_cm": 30, "largura_cm": 20, "profundidade_cm": 15 }, "confidence": 0.6, "source_ids": ["img1"] },
  "embalagem": { "value": "tipo_embalagem", "confidence": 0.7, "source_ids": ["img1"] },
  "etiquetas_visiveis": { "value": ["codigo_barras", "marca"], "confidence": 0.9, "source_ids": ["img1"] },
  "estado_produto": { "value": "novo|usado|danificado", "confidence": 0.8, "source_ids": ["img1"] },
  "observacoes": "Detalhes adicionais relevantes"
}`,
      outputSchema: {
        type: 'object',
        properties: {
          tipo_produto: { type: 'object', properties: { value: { type: 'string' }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          cores: { type: 'object', properties: { value: { type: 'array', items: { type: 'string' } }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          material_aparente: { type: 'object', properties: { value: { type: 'string' }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          dimensoes_estimadas: { type: 'object', properties: { value: { type: 'object', properties: { altura_cm: { type: 'number' }, largura_cm: { type: 'number' }, profundidade_cm: { type: 'number' } } }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          embalagem: { type: 'object', properties: { value: { type: 'string' }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          etiquetas_visiveis: { type: 'object', properties: { value: { type: 'array', items: { type: 'string' } }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          estado_produto: { type: 'object', properties: { value: { type: 'string', enum: ['novo', 'usado', 'danificado'] }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          observacoes: { type: 'object', properties: { value: { type: 'string' }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } }
        }
      },
      inputVariables: ['sources', 'inputContext'],
      description: 'Análise visual de produto via imagens (requer modelo com vision)',
    };
  }

  private getGenerationPrompt(identity: { orgId: string; userId?: string }): Partial<any> {
    return {
      name: 'product_content_generation',
      version: 1,
      taskType: 'generation',
      systemPrompt: `Você é um copywriter especializado em fichas técnicas e conteúdo para e-commerce.

Gere conteúdo otimizado para conversão e SEO a partir dos dados estruturados do produto.

DIRETRIZES:
1. Nome comercial: atrativo, descritivo, até 120 caracteres
2. Descrição curta: 160-300 chars, benefícios + características principais
3. Descrição longa: 500-2000 chars, storytelling + specs + benefícios
3. Bullet points: 5-8 pontos, foco em benefícios + specs técnicas
4. SEO Title: até 60 chars, palavra-chave principal no início
5. SEO Description: 150-160 chars, call-to-action
6. Keywords: 10-15 termos relevantes
7. FAQ: 3-5 perguntas frequentes reais
8. Tom de voz: profissional, confiável, orientado a benefícios
7. NÃO invente specs - use apenas dados fornecidos
8. Se falta info, indique [VERIFICAR] no campo`,
      userPromptTemplate: `DADOS DO PRODUTO:
{{product}}

ATRIBUTOS:
{{attributes}}

FONTES ORIGINAIS:
{{sources}}

CONTEXTO:
{{inputContext}}

Gere conteúdo completo para e-commerce:
{
  "nome_comercial": { "value": "Nome atrativo do produto", "confidence": 0.95, "source_ids": ["product_data"] },
  "descricao_curta": { "value": "Descrição de 160-300 chars...", "confidence": 0.9, "source_ids": ["product_data"] },
  "descricao_longa": { "value": "Descrição completa 500-2000 chars...", "confidence": 0.9, "source_ids": ["product_data"] },
  "bullet_points": { "value": ["Benefício 1", "Benefício 2", "Spec 1", "Spec 2"], "confidence": 0.9, "source_ids": ["product_data"] },
  "seo_title": { "value": "Título SEO até 60 chars", "confidence": 0.95, "source_ids": ["product_data"] },
  "seo_description": { "value": "Meta description 150-160 chars", "confidence": 0.9, "source_ids": ["product_data"] },
  "keywords": { "value": ["keyword1", "keyword2", "keyword3"], "confidence": 0.85, "source_ids": ["product_data"] },
  "faq": {
    "value": [
      { "pergunta": "Qual o material?", "resposta": "Material X" },
      { "pergunta": "Qual a garantia?", "resposta": "12 meses" }
    ],
    "confidence": 0.8,
    "source_ids": ["product_data"]
  }
}`,
      outputSchema: {
        type: 'object',
        properties: {
          nome_comercial: { type: 'object', properties: { value: { type: 'string' }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          descricao_curta: { type: 'object', properties: { value: { type: 'string' }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          descricao_longa: { type: 'object', properties: { value: { type: 'string' }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          bullet_points: { type: 'object', properties: { value: { type: 'array', items: { type: 'string' } }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          seo_title: { type: 'object', properties: { value: { type: 'string' }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          seo_description: { type: 'object', properties: { value: { type: 'string' }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          keywords: { type: 'object', properties: { value: { type: 'array', items: { type: 'string' } }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } },
          faq: { type: 'object', properties: { value: { type: 'array', items: { type: 'object', properties: { pergunta: { type: 'string' }, resposta: { type: 'string' } } } }, confidence: { type: 'number' }, source_ids: { type: 'array', items: { type: 'string' } } } }
        }
      },
      inputVariables: ['product', 'attributes', 'sources', 'inputContext'],
      description: 'Geração de conteúdo comercial (nome, descrições, bullets, SEO, FAQ)',
    };
  }

  private getReadinessPrompt(identity: { orgId: string; userId?: string }): Partial<any> {
    return {
      name: 'marketplace_readiness_check',
      version: 1,
      taskType: 'readiness',
      systemPrompt: `Você é um especialista em requisitos de marketplaces (Mercado Livre, Shopee, Amazon, TikTok Shop).

Analise o produto e identifique o que está faltando para publicação em cada canal.

REGRAS:
1. Conheça os atributos obrigatórios de cada marketplace
2. Verifique se o produto tem EAN válido (GTIN-13)
3. Verifique se tem NCM válido (8 dígitos)
4. Verifique se tem marca cadastrada
5. Verifique se tem imagens (mínimo 1, ideal 5+)
5. Verifique descrição completa
6. Verifique atributos obrigatórios por categoria/canal
7. Retorne checklist por canal`,
      userPromptTemplate: `PRODUTO:
{{product}}

ATRIBUTOS:
{{attributes}}

IMAGENS:
{{images}}

CATEGORIA:
{{category}}

MARKETPLACES ALVO:
{{marketplaces}}

Retorne readiness por marketplace:
{
  "mercado_livre": {
    "pronto": true,
    "score": 85,
    "obrigatorios_ok": ["ean", "marca", "ncm", "titulo", "descricao", "imagens"],
    "obrigatorios_faltando": ["cor", "tamanho"],
    "recomendados_faltando": ["video", "ficha_tecnica"],
    "alertas": ["EAN parece inválido - verificar dígito verificador"]
  },
  "shopee": { ... },
  "amazon": { ... },
  "tiktok_shop": { ... }
}`,
      outputSchema: {
        type: 'object',
        properties: {
          mercado_livre: { type: 'object', properties: { pronto: { type: 'boolean' }, score: { type: 'number' }, obrigatorios_ok: { type: 'array', items: { type: 'string' } }, obrigatorios_faltando: { type: 'array', items: { type: 'string' } }, recomendados_faltando: { type: 'array', items: { type: 'string' } }, alertas: { type: 'array', items: { type: 'string' } } } },
          shopee: { type: 'object' },
          amazon: { type: 'object' },
          tiktok_shop: { type: 'object' }
        }
      },
      inputVariables: ['product', 'attributes', 'images', 'category', 'marketplaces'],
      description: 'Verificação de prontidão para publicação em marketplaces',
    };
  }
}
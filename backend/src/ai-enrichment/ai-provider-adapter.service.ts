import { Injectable } from '@nestjs/common';

export interface LLMRequest {
  model: {
    provider: string;
    modelIdentifier: string;
    baseUrl?: string;
    apiKeyEncrypted?: string;
    capabilities?: Record<string, unknown>;
    config?: Record<string, unknown>;
  };
  prompt: {
    system: string;
    template: string;
    outputSchema: Record<string, unknown>;
  };
  context: {
    taskType: string;
    product?: any;
    inputContext?: Record<string, unknown>;
    sources: Array<{
      type: string;
      text: string;
      metadata?: Record<string, unknown>;
    }>;
    attributesSchema?: any[];
  };
}

export interface LLMResponse {
  structured: Record<string, unknown>;
  raw: string;
  tokensInput: number;
  tokensOutput: number;
}

@Injectable()
export class AiProviderAdapterService {
  async generate(request: LLMRequest): Promise<LLMResponse> {
    const { model, prompt, context } = request;

    switch (model.provider) {
      case 'ollama':
        return this.callOllama(model, prompt, context);
      case 'vllm':
        return this.callVLLM(model, prompt, context);
      case 'openai':
        return this.callOpenAI(model, prompt, context);
      case 'anthropic':
        return this.callAnthropic(model, prompt, context);
      case 'openai-compatible':
        return this.callOpenAICompatible(model, prompt, context);
      default:
        throw new Error(`Provider não suportado: ${model.provider}`);
    }
  }

  private async callOllama(model: any, prompt: any, context: any) {
    const baseUrl = model.baseUrl || 'http://localhost:11434';
    const endpoint = `${baseUrl}/api/generate`;

    const userPrompt = this.renderTemplate(prompt.template, {
      sources: context.sources.map((s, i) => `--- Fonte ${i + 1} (${s.type}) ---\n${s.text}`).join('\n\n'),
      product: JSON.stringify(context.product, null, 2),
      inputContext: JSON.stringify(context.inputContext, null, 2),
      attributesSchema: JSON.stringify(context.attributesSchema, null, 2),
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.modelIdentifier,
        system: prompt.system,
        prompt: userPrompt,
        format: 'json',
        options: {
          temperature: model.config?.temperature ?? 0.1,
          top_p: model.config?.top_p ?? 0.9,
          num_predict: model.config?.max_tokens ?? 4096,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const raw = data.response;
    let structured: Record<string, unknown> = {};

    try {
      // Ollama com format: 'json' retorna JSON direto
      structured = JSON.parse(raw);
    } catch {
      // Tentar extrair JSON do texto
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structured = JSON.parse(jsonMatch[0]);
      }
    }

    return {
      structured,
      raw,
      tokensInput: data.prompt_eval_count ?? 0,
      tokensOutput: data.eval_count ?? 0,
    };
  }

  private async callVLLM(model: any, prompt: any, context: any) {
    const baseUrl = model.baseUrl || 'http://localhost:8000';
    const endpoint = `${baseUrl}/v1/chat/completions`;

    const apiKey = model.apiKeyEncrypted ? this.decryptApiKey(model.apiKeyEncrypted) : 'EMPTY';

    const userPrompt = this.renderTemplate(prompt.template, {
      sources: context.sources.map((s, i) => `--- Fonte ${i + 1} (${s.type}) ---\n${s.text}`).join('\n\n'),
      product: JSON.stringify(context.product, null, 2),
      inputContext: JSON.stringify(context.inputContext, null, 2),
      attributesSchema: JSON.stringify(context.attributesSchema, null, 2),
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.modelIdentifier,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: this.renderTemplate(prompt.template, {
            sources: context.sources.map((s, i) => `--- Fonte ${i + 1} (${s.type}) ---\n${s.text}`).join('\n\n'),
            product: JSON.stringify(context.product, null, 2),
            inputContext: JSON.stringify(context.inputContext, null, 2),
            attributesSchema: JSON.stringify(context.attributesSchema, null, 2),
          }) },
        ],
        response_format: { type: 'json_object' },
        temperature: model.config?.temperature ?? 0.1,
        top_p: model.config?.top_p ?? 0.9,
        max_tokens: model.config?.max_tokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`vLLM error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const raw = data.choices[0]?.message?.content ?? '';
    let structured: Record<string, unknown> = {};

    try {
      structured = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) structured = JSON.parse(jsonMatch[0]);
    }

    return {
      structured,
      raw,
      tokensInput: data.usage?.prompt_tokens ?? 0,
      tokensOutput: data.usage?.completion_tokens ?? 0,
    };
  }

  private async callOpenAI(model: any, prompt: any, context: any) {
    const apiKey = model.apiKeyEncrypted ? this.decryptApiKey(model.apiKeyEncrypted) : process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key não configurada');

    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const userPrompt = this.renderTemplate(prompt.template, {
      sources: context.sources.map((s, i) => `--- Fonte ${i + 1} (${s.type}) ---\n${s.text}`).join('\n\n'),
      product: JSON.stringify(context.product, null, 2),
      inputContext: JSON.stringify(context.inputContext, null, 2),
      attributesSchema: JSON.stringify(context.attributesSchema, null, 2),
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.modelIdentifier,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: this.renderTemplate(prompt.template, {
            sources: context.sources.map((s, i) => `--- Fonte ${i + 1} (${s.type}) ---\n${s.text}`).join('\n\n'),
            product: JSON.stringify(context.product, null, 2),
            inputContext: JSON.stringify(context.inputContext, null, 2),
            attributesSchema: JSON.stringify(context.attributesSchema, null, 2),
          }) },
        ],
        response_format: { type: 'json_object' },
        temperature: model.config?.temperature ?? 0.1,
        top_p: model.config?.top_p ?? 0.9,
        max_tokens: model.config?.max_tokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const raw = data.choices[0]?.message?.content ?? '';
    let structured: Record<string, unknown> = {};

    try {
      structured = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) structured = JSON.parse(jsonMatch[0]);
    }

    return {
      structured,
      raw,
      tokensInput: data.usage?.prompt_tokens ?? 0,
      tokensOutput: data.usage?.completion_tokens ?? 0,
    };
  }

  private async callAnthropic(model: any, prompt: any, context: any) {
    const apiKey = model.apiKeyEncrypted ? this.decryptApiKey(model.apiKeyEncrypted) : process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Anthropic API key não configurada');

    const userPrompt = this.renderTemplate(prompt.template, {
      sources: context.sources.map((s, i) => `--- Fonte ${i + 1} (${s.type}) ---\n${s.text}`).join('\n\n'),
      product: JSON.stringify(context.product, null, 2),
      inputContext: JSON.stringify(context.inputContext, null, 2),
      attributesSchema: JSON.stringify(context.attributesSchema, null, 2),
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model.modelIdentifier,
        system: prompt.system,
        messages: [
          { role: 'user', content: this.renderTemplate(prompt.template, {
            sources: context.sources.map((s, i) => `--- Fonte ${i + 1} (${s.type}) ---\n${s.text}`).join('\n\n'),
            product: JSON.stringify(context.product, null, 2),
            inputContext: JSON.stringify(context.inputContext, null, 2),
            attributesSchema: JSON.stringify(context.attributesSchema, null, 2),
          }) },
        ],
        max_tokens: model.config?.max_tokens ?? 4096,
        temperature: model.config?.temperature ?? 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const raw = data.content[0]?.text ?? '';
    let structured: Record<string, unknown> = {};

    try {
      structured = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) structured = JSON.parse(jsonMatch[0]);
    }

    return {
      structured,
      raw,
      tokensInput: data.usage?.input_tokens ?? 0,
      tokensOutput: data.usage?.output_tokens ?? 0,
    };
  }

  private async callOpenAICompatible(model: any, prompt: any, context: any) {
    const baseUrl = model.baseUrl;
    const apiKey = model.apiKeyEncrypted ? this.decryptApiKey(model.apiKeyEncrypted) : '';

    const userPrompt = this.renderTemplate(prompt.template, {
      sources: context.sources.map((s, i) => `--- Fonte ${i + 1} (${s.type}) ---\n${s.text}`).join('\n\n'),
      product: JSON.stringify(context.product, null, 2),
      inputContext: JSON.stringify(context.inputContext, null, 2),
      attributesSchema: JSON.stringify(context.attributesSchema, null, 2),
    });

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey ? `Bearer ${apiKey}` : '',
      },
      body: JSON.stringify({
        model: model.modelIdentifier,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: this.renderTemplate(prompt.template, {
            sources: context.sources.map((s, i) => `--- Fonte ${i + 1} (${s.type}) ---\n${s.text}`).join('\n\n'),
            product: JSON.stringify(context.product, null, 2),
            inputContext: JSON.stringify(context.inputContext, null, 2),
            attributesSchema: JSON.stringify(context.attributesSchema, null, 2),
          }) },
        ],
        response_format: { type: 'json_object' },
        temperature: model.config?.temperature ?? 0.1,
        top_p: model.config?.top_p ?? 0.9,
        max_tokens: model.config?.max_tokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI-compatible error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const raw = data.choices[0]?.message?.content ?? '';
    let structured: Record<string, unknown> = {};

    try {
      structured = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) structured = JSON.parse(jsonMatch[0]);
    }

    return {
      structured,
      raw,
      tokensInput: data.usage?.prompt_tokens ?? 0,
      tokensOutput: data.usage?.completion_tokens ?? 0,
    };
  }

  private renderTemplate(template: string, variables: Record<string, unknown>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const strValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      result = result.split(placeholder).join(strValue);
    }
    return result;
  }

  private decryptApiKey(encrypted: string): string {
    if (!encrypted?.startsWith('enc:')) return encrypted;
    try {
      return Buffer.from(encrypted.slice(4), 'base64').toString();
    } catch {
      return encrypted;
    }
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration } from '../integrations/integration.entity';

export interface MlAuthConfig {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: number;
  nickname?: string;
}

export interface MlItem {
  id?: string;
  title: string;
  category_id: string;
  price: number;
  currency_id: string;
  quantity: number;
  condition: string;
  description?: string;
  pictures: { id?: string; source: string }[];
  attributes: { id_name: string; value_name: string }[];
  shipping?: Record<string, unknown>;
  status?: string;
  permalink?: string;
  date_created?: string;
  last_updated?: string;
}

export interface MlApiResponse<T = unknown> {
  status?: number;
  data: T;
}

@Injectable()
export class MlProviderAdapterService {
  private readonly logger = new Logger(MlProviderAdapterService.name);
  private readonly BASE_URL = 'https://api.mercadolibre.com';

  constructor(
    @InjectRepository(Integration)
    private readonly integrations: Repository<Integration>,
  ) {}

  async getAuthConfig(orgId: string): Promise<MlAuthConfig | null> {
    const integration = await this.integrations.findOne({
      where: { organizationId: orgId, tipo: 'mercado_livre', status: 'ativa' },
    });
    if (!integration || !integration.credenciais) return null;
    return integration.credenciais as unknown as MlAuthConfig;
  }

  async saveAuthConfig(orgId: string, config: MlAuthConfig): Promise<void> {
    let integration = await this.integrations.findOne({
      where: { organizationId: orgId, tipo: 'mercado_livre' },
    });

    if (!integration) {
      integration = this.integrations.create({
        organizationId: orgId,
        tipo: 'mercado_livre',
        nome: 'Mercado Livre',
        status: 'ativa',
        credenciais: config as unknown as Record<string, unknown>,
      });
    } else {
      integration.credenciais = config as unknown as Record<string, unknown>;
      integration.status = 'ativa';
    }

    await this.integrations.save(integration);
  }

  private async request<T>(
    orgId: string,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const auth = await this.getAuthConfig(orgId);
    if (!auth?.access_token) {
      throw new Error('Integração Mercado Livre não configurada ou token expirado');
    }

    const url = `${this.BASE_URL}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${auth.access_token}`,
      'Content-Type': 'application/json',
    };

    const resp = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await resp.json() as Record<string, unknown>;

    if (!resp.ok) {
      const msg = (data as any).message ?? JSON.stringify(data);
      this.logger.error(`ML API ${method} ${path} → ${resp.status}: ${msg}`);
      throw new Error(`Mercado Livre API error ${resp.status}: ${msg}`);
    }

    return data as T;
  }

  async getCategories(orgId: string): Promise<any[]> {
    return this.request<any[]>(orgId, 'GET', '/sites/MLB/categories');
  }

  async getCategoryAttributes(orgId: string, categoryId: string): Promise<any[]> {
    return this.request<any[]>(orgId, 'GET', `/categories/${categoryId}/attributes`);
  }

  async createItem(orgId: string, item: MlItem): Promise<any> {
    return this.request<any>(orgId, 'POST', '/items', item);
  }

  async updateItem(orgId: string, itemId: string, item: Partial<MlItem>): Promise<any> {
    return this.request<any>(orgId, 'PUT', `/items/${itemId}`, item);
  }

  async getItem(orgId: string, itemId: string): Promise<any> {
    return this.request<any>(orgId, 'GET', `/items/${itemId}`);
  }

  async pauseItem(orgId: string, itemId: string): Promise<any> {
    return this.request<any>(orgId, 'PUT', `/items/${itemId}`, { status: 'paused' });
  }

  async activateItem(orgId: string, itemId: string): Promise<any> {
    return this.request<any>(orgId, 'PUT', `/items/${itemId}`, { status: 'active' });
  }

  async endItem(orgId: string, itemId: string): Promise<any> {
    return this.request<any>(orgId, 'PUT', `/items/${itemId}`, { status: 'closed' });
  }

  async uploadPicture(orgId: string, pictureUrl: string): Promise<any> {
    return this.request<any>(orgId, 'POST', '/pictures/items/upload', { source: pictureUrl });
  }

  async getSellerItems(orgId: string, sellerId: string, offset = 0, limit = 50): Promise<any> {
    return this.request<any>(
      orgId,
      'GET',
      `/users/${sellerId}/items/search?offset=${offset}&limit=${limit}`,
    );
  }

  async getUserInfo(orgId: string): Promise<any> {
    return this.request<any>(orgId, 'GET', '/users/me');
  }

  async refreshToken(orgId: string): Promise<MlAuthConfig> {
    const auth = await this.getAuthConfig(orgId);
    if (!auth?.refresh_token) {
      throw new Error('Refresh token não disponível — reautentique manualmente');
    }

    const integration = await this.integrations.findOne({
      where: { organizationId: orgId, tipo: 'mercado_livre' },
    });
    const config = integration?.configuracao as Record<string, unknown> ?? {};
    const clientId = config.client_id as string;
    const clientSecret = config.client_secret as string;

    if (!clientId || !clientSecret) {
      throw new Error('client_id/client_secret não configurados na integração ML');
    }

    const resp = await fetch(`${this.BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: auth.refresh_token,
      }).toString(),
    });

    const data = await resp.json() as Record<string, unknown>;
    if (!resp.ok) {
      throw new Error(`Erro ao renovar token ML: ${(data as any).message}`);
    }

    const newAuth: MlAuthConfig = {
      access_token: data.access_token as string,
      refresh_token: data.refresh_token as string,
      expires_in: data.expires_in as number,
      user_id: data.user_id as number,
      nickname: auth.nickname,
    };

    await this.saveAuthConfig(orgId, newAuth);
    this.logger.log(`Token ML renovado para org ${orgId}`);
    return newAuth;
  }
}

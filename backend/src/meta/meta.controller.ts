import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/auth/decorators';

@ApiTags('meta')
@Controller()
export class MetaController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Healthcheck' })
  health() {
    return { status: 'ok', app: 'arqprod-api', time: new Date().toISOString() };
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Informações da API' })
  info() {
    return {
      name: 'Arqprod API',
      version: '0.1.0',
      docs: '/api/docs',
      auth: 'Authorization: Bearer akp_... (API key) ou JWT (painel)',
      scopes: [
        'products:read',
        'products:write',
        'catalog:read',
        'catalog:write',
        'inventory:read',
        'inventory:write',
        'pricing:read',
        'pricing:write',
        'webhooks:read',
        'webhooks:write',
      ],
    };
  }
}
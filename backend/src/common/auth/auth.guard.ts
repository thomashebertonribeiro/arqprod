import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../../api-keys/api-key.entity';
import { hashApiKey } from './api-key.util';
import { IS_PUBLIC_KEY, ROLES_KEY } from './decorators';
import { RequestIdentity } from './current-identity.decorator';

export interface JwtPayload {
  sub: string;
  orgId: string;
  papel: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest();
    if (isPublic) {
      req.identity = null;
      return true;
    }

    const authHeader: string | undefined = req.headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header ausente');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Formato inválido: Bearer <token>');
    }

    let identity: RequestIdentity;
    if (token.startsWith('akp_')) {
      identity = await this.authenticateApiKey(token, req);
    } else {
      identity = await this.authenticateJwt(token);
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles?.length) {
      const hasRole = requiredRoles.includes(identity.papel ?? '');
      if (!hasRole) {
        throw new UnauthorizedException('Papel insuficiente');
      }
    }

    req.identity = identity;
    return true;
  }

  private async authenticateApiKey(
    rawKey: string,
    req: any,
  ): Promise<RequestIdentity> {
    const salt = this.config.get<string>('API_KEY_HASH_SALT') ?? '';
    const hash = hashApiKey(rawKey, salt);
    const apiKey = await this.apiKeyRepo.findOne({ where: { chaveHash: hash } });

    if (!apiKey || apiKey.status !== 'ativa') {
      throw new UnauthorizedException('API key inválida ou revogada');
    }
    if (apiKey.expiraEm && apiKey.expiraEm < new Date()) {
      throw new UnauthorizedException('API key expirada');
    }

    apiKey.ultimaUtilizacao = new Date();
    await this.apiKeyRepo.save(apiKey, { reload: false }).catch(() => undefined);

    req.apiKeyId = apiKey.id;
    return {
      orgId: apiKey.organizationId,
      authType: 'api_key',
      scopes: apiKey.escopos,
    };
  }

  private async authenticateJwt(token: string): Promise<RequestIdentity> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return {
        orgId: payload.orgId,
        userId: payload.sub,
        papel: payload.papel,
        authType: 'jwt',
      };
    } catch {
      throw new UnauthorizedException('Token JWT inválido ou expirado');
    }
  }
}
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CurrentIdentity } from '../common/auth/current-identity.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Usuário autenticado (apenas JWT)' })
  async me(@CurrentIdentity() identity: { userId?: string; orgId: string }) {
    if (!identity.userId) {
      return { auth_type: 'api_key', organization_id: identity.orgId };
    }
    const user = await this.users.findOne({
      where: { id: identity.userId },
      relations: { organization: true },
    });
    if (!user) return null;
    const { senhaHash, ...safe } = user;
    return safe;
  }
}
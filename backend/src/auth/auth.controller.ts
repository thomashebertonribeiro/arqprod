import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Public } from '../common/auth/decorators';
import { LoginDto, LoginResponseDto } from './dto';
import { JwtPayload } from '../common/auth/auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login do painel admin — retorna JWT' })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.users.findOne({
      where: { email: dto.email },
      relations: { organization: true },
    });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    if (user.organization.status !== 'ativo') {
      throw new UnauthorizedException('Organização suspensa');
    }
    const ok = await bcrypt.compare(dto.senha, user.senhaHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    user.ultimoAcesso = new Date();
    await this.users.save(user, { reload: false }).catch(() => undefined);

    const payload: JwtPayload = {
      sub: user.id,
      orgId: user.organizationId,
      papel: user.papel,
    };
    const expiresIn = 60 * 60 * 12;
    return {
      access_token: await this.jwt.signAsync(payload, { expiresIn }),
      expires_in: expiresIn,
      user: { id: user.id, nome: user.nome, email: user.email, papel: user.papel },
    };
  }
}
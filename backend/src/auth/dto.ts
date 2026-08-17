import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@exemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123456' })
  @IsString()
  @MinLength(6)
  senha: string;
}

export class LoginResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  expires_in: number;

  @ApiProperty({ example: { id: 'uuid', nome: 'Admin', papel: 'admin' } })
  user: { id: string; nome: string; email: string; papel: string };
}
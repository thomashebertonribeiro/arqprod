import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Nike' })
  @IsString()
  @MaxLength(255)
  nome: string;
}

export class UpdateBrandDto {
  @ApiPropertyOptional({ example: 'Nike' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nome?: string;
}
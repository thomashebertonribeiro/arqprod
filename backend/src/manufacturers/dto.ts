import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateManufacturerDto {
  @ApiProperty({ example: 'LG Electronics' })
  @IsString()
  @MaxLength(255)
  nome: string;
}

export class UpdateManufacturerDto {
  @ApiPropertyOptional({ example: 'LG Electronics' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nome?: string;
}
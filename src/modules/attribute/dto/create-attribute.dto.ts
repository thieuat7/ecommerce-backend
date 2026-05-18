import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateAttributeDto {
  @ApiProperty({ example: 'color', description: 'Tên nội bộ (unique, lowercase)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Màu sắc', description: 'Tên hiển thị' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName: string;
}

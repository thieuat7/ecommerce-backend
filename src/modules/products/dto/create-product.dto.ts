import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro Max', description: 'Tên sản phẩm' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Mô tả sản phẩm...', description: 'Mô tả' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 29990000, description: 'Giá cơ bản (base price)' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái hiển thị' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

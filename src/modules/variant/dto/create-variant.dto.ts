import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ArrayNotEmpty,
} from 'class-validator';

export class CreateVariantDto {
  @ApiPropertyOptional({
    example: 'IP15PM-TITAN-256',
    description: 'SKU (tự sinh nếu bỏ trống)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiProperty({ example: 29990000, description: 'Giá của biến thể' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 50, description: 'Số lượng tồn kho ban đầu' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stockQuantity: number;

  @ApiPropertyOptional({ example: true, description: 'Kích hoạt biến thể' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: [1, 5],
    description: 'Danh sách attribute_value_id để xác định biến thể',
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  attributeValueIds: number[];

  @ApiPropertyOptional({
    example: 'Nhập kho ban đầu',
    description: 'Lý do nhập kho (ghi vào stock_log)',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

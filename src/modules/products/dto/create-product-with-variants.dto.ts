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

// ─── DTO con: một biến thể trong request multipart ───────────────────────────
// FE gửi dưới dạng JSON.stringify rồi parse lại ở service

export interface VariantInFormDto {
  sku?: string;
  price: number;
  stockQuantity: number;
  isActive?: boolean;
  attributeValueIds: number[];
  reason?: string;
}

// ─── DTO chính nhận từ @Body() multipart/form-data ───────────────────────────

export class CreateProductWithVariantsDto {
  @ApiProperty({ example: 'iPhone 15 Pro Max', description: 'Tên sản phẩm' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Mô tả sản phẩm...', description: 'Mô tả' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '29990000',
    description: 'Giá cơ bản (BE sẽ ép kiểu Number)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    example: 'true',
    description: 'Trạng thái hiển thị (mặc định: true)',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  /**
   * FE stringify: JSON.stringify([1, 3])
   * BE sẽ JSON.parse() thủ công trong service.
   */
  @ApiPropertyOptional({
    example: '[1, 3]',
    description: 'JSON string của mảng categoryId',
  })
  @IsOptional()
  @IsString()
  categoryIds?: string; // raw string, parse trong service

  /**
   * FE stringify toàn bộ mảng variants:
   * JSON.stringify([{ sku, price, stockQuantity, attributeValueIds, reason }])
   * BE sẽ JSON.parse() trong service.
   */
  @ApiPropertyOptional({
    example:
      '[{"sku":"IP15PM-256","price":29990000,"stockQuantity":50,"attributeValueIds":[10,25]}]',
    description: 'JSON string của mảng variants',
  })
  @IsOptional()
  @IsString()
  variants?: string; // raw string, parse trong service
}

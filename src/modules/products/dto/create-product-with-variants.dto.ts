import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  MaxLength,
  Min,
  IsArray,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { BadRequestException } from '@nestjs/common';

// ─── DTO con: Variant ───────────────────────────

export class VariantDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockQuantity: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : value,
  )
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @Transform(({ value }: { value: unknown }) => {
    if (!Array.isArray(value)) return [Number(value)];
    return value.map((v: unknown) => Number(v));
  })
  @IsInt({ each: true })
  attributeValueIds: number[];

  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── DTO chính ───────────────────────────

export class CreateProductWithVariantsDto {
  @ApiProperty({ example: 'iPhone 15 Pro Max' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Mô tả sản phẩm...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 29990000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : value,
  )
  @IsBoolean()
  isActive?: boolean;

  // 🔥 categoryIds: string → number[]
  @ApiPropertyOptional({
    example: '[1,3]',
    description: 'JSON string hoặc array',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (!value) return [];

    if (Array.isArray(value)) return value.map(Number);

    if (typeof value === 'string') {
      try {
        // Ép kiểu rõ ràng sau khi parse để tránh lỗi unsafe assignment
        const parsed = JSON.parse(value) as unknown;

        if (!Array.isArray(parsed)) throw new Error();

        return parsed.map((v: unknown) => {
          const num = Number(v);
          if (!Number.isInteger(num)) {
            throw new BadRequestException('categoryIds phải là số nguyên');
          }
          return num;
        });
      } catch {
        throw new BadRequestException(
          'categoryIds phải là JSON string hợp lệ, ví dụ: "[1,3]"',
        );
      }
    }
    return [];
  })
  @IsInt({ each: true })
  categoryIds: number[];

  // 🔥 variants: string → object[]
  @ApiPropertyOptional({
    example:
      '[{"sku":"IP15","price":1000,"stockQuantity":10,"attributeValueIds":[1,2]}]',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (!value) return [];

    let parsed: unknown = value;

    // 1. Nếu dữ liệu là chuỗi (từ form-data gửi lên) thì Parse ra
    if (typeof value === 'string') {
      try {
        // Ép kiểu as unknown để ESLint không bắt lỗi
        parsed = JSON.parse(value) as unknown;
      } catch {
        throw new BadRequestException('variants phải là JSON string hợp lệ');
      }
    }

    // 2. Đảm bảo dữ liệu sau khi parse là một mảng
    if (!Array.isArray(parsed)) {
      throw new BadRequestException('variants phải là một mảng');
    }

    // 3. 🎯 QUAN TRỌNG NHẤT: Chuyển đổi Plain Object thành Instance của VariantDto
    // Ép kiểu mảng thành object[] để hàm plainToInstance hoạt động mượt mà
    return plainToInstance(VariantDto, parsed as Record<string, unknown>[]);
  })
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants: VariantDto[];
}

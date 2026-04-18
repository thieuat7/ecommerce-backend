import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  Min,
  IsIn,
} from 'class-validator';

export class FilterProductDto {
  // ─── TÌM KIẾM ──────────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    example: 'iPhone',
    description: 'Tìm theo tên sản phẩm (LIKE)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  // ─── LỌC THEO DANH MỤC ─────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 2, description: 'Lọc theo ID danh mục' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  // ─── LỌC THEO KHOẢNG GIÁ ───────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 0, description: 'Giá tối thiểu' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 5000000, description: 'Giá tối đa' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  // ─── LỌC THEO TỒN KHO ──────────────────────────────────────────────────────
  @ApiPropertyOptional({
    example: 1,
    description: 'Số lượng tồn kho tối thiểu',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStock?: number;

  // ─── SẮP XẾP ───────────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    example: 'price',
    description:
      'Sắp xếp theo trường (price | name | createdAt | stockQuantity)',
    enum: ['price', 'name', 'createdAt', 'stockQuantity'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['price', 'name', 'createdAt', 'stockQuantity'])
  sortBy?: 'price' | 'name' | 'createdAt' | 'stockQuantity' = 'createdAt';

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Chiều sắp xếp: ASC hoặc DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  // ─── PHÂN TRANG ─────────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    example: 1,
    description: 'Trang hiện tại (bắt đầu từ 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Số sản phẩm mỗi trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

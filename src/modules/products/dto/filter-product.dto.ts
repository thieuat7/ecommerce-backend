import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  IsBoolean,
  Min,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

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

  // ─── LỌC THEO TRẠNG THÁI ───────────────────────────────────────────────────
  @ApiPropertyOptional({ example: true, description: 'Lọc theo trạng thái hoạt động' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  // ─── LỌC THEO KHOẢNG GIÁ ───────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 0, description: 'Giá tối thiểu' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 50000000, description: 'Giá tối đa' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  // ─── SẮP XẾP ───────────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Sắp xếp theo trường (price | name | createdAt)',
    enum: ['price', 'name', 'createdAt'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['price', 'name', 'createdAt'])
  sortBy?: 'price' | 'name' | 'createdAt' = 'createdAt';

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
  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại (bắt đầu từ 1)' })
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

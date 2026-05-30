import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { BadRequestException } from '@nestjs/common';

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
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50, description: 'Số lượng tồn kho ban đầu' })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  stockQuantity: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Trạng thái hiển thị (mặc định: true)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: [1, 5],
    description: 'Danh sách attribute_value_id để xác định biến thể',
    type: [Number],
  })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map(Number);
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) throw new Error();
      return parsed.map(Number);
    } catch {
      throw new BadRequestException(
        'attributeValueIds phải là array hoặc JSON string hợp lệ',
      );
    }
  })
  @ApiProperty({
    example: [1, 5],
    description: 'Danh sách attribute_value_id để xác định biến thể',
    type: [Number],
  })
  @Transform(({ value }) => {
    // 1. Nếu trống thì trả về mảng rỗng
    if (value === undefined || value === null || value === '') return [];

    // 2. Xử lý nếu dữ liệu là String (từ Postman gửi form-data lên)
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value); // Thử parse dạng JSON "[1, 2]"
        if (Array.isArray(parsed)) return parsed.map(Number);
      } catch {
        // Nếu không phải JSON, cắt chuỗi theo dấu phẩy "1, 2"
        return value.split(',').map((v) => Number(v.trim()));
      }
    }

    // 3. Nếu là 1 giá trị đơn lẻ không nằm trong mảng (vd: 1)
    if (!Array.isArray(value)) {
      return [Number(value)];
    }

    // 4. Nếu vốn đã là mảng thì map ra số
    return value.map(Number);
  })
  @IsArray({ message: 'attributeValueIds phải là một mảng' })
  @IsInt({
    each: true,
    message: 'Mỗi giá trị trong attributeValueIds phải là số nguyên',
  })
  attributeValueIds: number[];

  @ApiPropertyOptional({
    example: 'Nhập kho ban đầu',
    description: 'Lý do nhập kho (ghi vào stock_log)',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

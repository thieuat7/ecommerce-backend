import {
  IsArray,
  ValidateNested,
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO cho từng dòng hàng trong đơn — bắt buộc chỉ định variantId */
export class CreateOrderItemDto {
  @ApiProperty({
    description: 'ID của biến thể sản phẩm (ProductVariant)',
    example: 3,
  })
  @IsInt({ message: 'variantId phải là số nguyên' })
  @IsPositive({ message: 'variantId phải là số dương' })
  variantId: number;

  @ApiProperty({
    description: 'Số lượng mua (tối thiểu 1)',
    example: 2,
    minimum: 1,
  })
  @IsInt({ message: 'quantity phải là số nguyên' })
  @IsPositive({ message: 'Số lượng phải lớn hơn 0' })
  quantity: number;
}

/** DTO chính để tạo Đơn hàng */
export class CreateOrderDto {
  @ApiProperty({
    description:
      'ID địa chỉ giao hàng (UserAddress) của người dùng. Thông tin địa chỉ sẽ được snapshot vào đơn hàng.',
    example: 1,
  })
  @IsInt({ message: 'userAddressId phải là số nguyên' })
  @IsPositive({ message: 'userAddressId phải là số dương' })
  userAddressId: number;

  @ApiProperty({
    description: 'Danh sách biến thể sản phẩm trong đơn hàng',
    type: [CreateOrderItemDto],
  })
  @IsArray({ message: 'items phải là một mảng' })
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất 1 sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({
    description: 'Mã đơn hàng tùy chỉnh (để trống hệ thống sẽ tự sinh)',
    example: 'ORD-20260101-001',
  })
  @IsOptional()
  @IsString()
  orderCode?: string;
}

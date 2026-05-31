import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateCartItemDto {
  @ApiProperty({
    description: 'ID của sản phẩm cần thêm vào giỏ hàng',
    example: 1,
  })
  @IsInt({ message: 'productId phải là số nguyên' })
  @IsPositive({ message: 'productId phải là số dương' })
  @IsNotEmpty()
  productId: number;

  @ApiPropertyOptional({
    description:
      'ID của biến thể sản phẩm (bỏ qua nếu sản phẩm không có biến thể)',
    example: 3,
  })
  @IsInt({ message: 'variantId phải là số nguyên' })
  @IsPositive({ message: 'variantId phải là số dương' })
  @IsOptional()
  variantId?: number;

  @ApiProperty({
    description: 'Số lượng muốn thêm vào giỏ (tối thiểu 1)',
    example: 2,
    default: 1,
    minimum: 1,
  })
  @IsInt({ message: 'quantity phải là số nguyên' })
  @Min(1, { message: 'quantity phải tối thiểu là 1' })
  @IsNotEmpty()
  quantity: number = 1;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

/**
 * DTO tạo order item dùng nội bộ (thực tế order items được tạo tự động qua OrdersService).
 * Không expose endpoint POST /order-items ra ngoài.
 */
export class CreateOrderItemDto {
  @ApiProperty({ description: 'ID biến thể sản phẩm', example: 1 })
  @IsInt()
  @IsPositive()
  variantId: number;

  @ApiProperty({ description: 'Số lượng', example: 2 })
  @IsInt()
  @IsPositive()
  quantity: number;
}

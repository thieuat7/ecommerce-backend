import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../enums/order-status.enum';

/**
 * DTO cập nhật đơn hàng.
 * Người dùng chỉ được phép cập nhật shippingAddress hoặc huỷ đơn (CANCELLED).
 * Admin có thể thay đổi trạng thái tự do thông qua endpoint riêng.
 */
export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'Địa chỉ giao hàng mới',
    example: '456 Lê Lợi, Quận 3, TP. Hồ Chí Minh',
  })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái đơn hàng mới (chỉ dùng cho Admin)',
    enum: OrderStatus,
    example: OrderStatus.PROCESSING,
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ' })
  status?: OrderStatus;
}

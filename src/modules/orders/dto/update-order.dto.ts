import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '../enums/order-status.enum';

/**
 * UpdateOrderDto — chỉ Admin mới được dùng để cập nhật trạng thái.
 * User chỉ được phép huỷ đơn qua endpoint riêng (DELETE /my-orders/:id).
 */
export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'Trạng thái đơn hàng mới',
    enum: OrderStatus,
    example: OrderStatus.PROCESSING,
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ' })
  status?: OrderStatus;
}

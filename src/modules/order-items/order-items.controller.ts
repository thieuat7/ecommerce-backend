import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OrderItemsService } from './order-items.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';

/**
 * OrderItemsController — chỉ cung cấp các endpoint đọc dữ liệu (GET).
 * Tạo và xóa order items được thực hiện thông qua OrdersController.
 */
@ApiTags('Order-Items')
@ApiBearerAuth()
@Controller('order-items')
@UseAuth('admin')
export class OrderItemsController {
  constructor(private readonly orderItemsService: OrderItemsService) {}

  /**
   * GET /order-items/by-order/:orderId
   * [Admin] Lấy tất cả items của một đơn hàng.
   */
  @Get('by-order/:orderId')
  @ApiOperation({
    summary: '[Admin] Lấy tất cả items của một đơn hàng',
    description:
      'Trả về danh sách tất cả order items thuộc một đơn hàng cụ thể.',
  })
  @ApiParam({ name: 'orderId', description: 'ID đơn hàng', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Danh sách order items của đơn hàng',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền admin' })
  async findByOrderId(@Param('orderId', ParseIntPipe) orderId: number) {
    const items = await this.orderItemsService.findByOrderId(orderId);
    return {
      message: `Lấy danh sách items của đơn hàng id=${orderId} thành công`,
      total: items.length,
      data: items,
    };
  }

  /**
   * GET /order-items/:id
   * [Admin] Lấy chi tiết một order item.
   */
  @Get(':id')
  @ApiOperation({
    summary: '[Admin] Lấy chi tiết một order item',
  })
  @ApiParam({ name: 'id', description: 'ID của order item', example: 1 })
  @ApiResponse({ status: 200, description: 'Chi tiết order item' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền admin' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy order item' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const item = await this.orderItemsService.findOne(id);
    return {
      message: 'Lấy chi tiết order item thành công',
      data: item,
    };
  }
}

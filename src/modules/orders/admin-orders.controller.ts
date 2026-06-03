import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';

/**
 * Controller quản lý đơn hàng dành cho ADMIN.
 * Prefix: /admin/orders
 */
@ApiTags('Admin Orders')
@ApiBearerAuth()
@Controller('admin/orders')
@UseAuth('admin')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── GET /admin/orders ────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: '[Admin] Lấy tất cả đơn hàng',
    description: 'Trả về toàn bộ đơn hàng trong hệ thống kèm thông tin user.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả đơn hàng' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền admin' })
  async findAll() {
    const orders = await this.ordersService.findAllForAdmin();
    return {
      message: 'Lấy danh sách đơn hàng thành công',
      total: orders.length,
      data: orders,
    };
  }

  // ── GET /admin/orders/:id ────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Lấy chi tiết bất kỳ đơn hàng' })
  @ApiParam({ name: 'id', description: 'ID đơn hàng', example: 1 })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng' })
  @ApiResponse({ status: 403, description: 'Không có quyền admin' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.findOneForAdmin(id);
    return { message: 'Lấy chi tiết đơn hàng thành công', data: order };
  }

  // ── PATCH /admin/orders/:id/status ───────────────────────────────────────────

  @Patch(':id/status')
  @ApiOperation({
    summary: '[Admin] Cập nhật trạng thái đơn hàng',
    description:
      'Admin có toàn quyền thay đổi trạng thái đơn hàng. Không thể thay đổi đơn đã CANCELLED.',
  })
  @ApiParam({ name: 'id', description: 'ID đơn hàng', example: 1 })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  @ApiResponse({ status: 400, description: 'Thiếu trường status' })
  @ApiResponse({ status: 403, description: 'Không được thay đổi đơn đã CANCELLED' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
  ) {
    const order = await this.ordersService.updateStatusForAdmin(id, dto);
    return {
      message: `Đã cập nhật trạng thái đơn hàng thành "${dto.status}"`,
      data: order,
    };
  }

  // ── DELETE /admin/orders/:id ─────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Admin] Xóa vĩnh viễn đơn hàng',
    description: 'Admin có thể xóa bất kỳ đơn hàng nào.',
  })
  @ApiParam({ name: 'id', description: 'ID đơn hàng cần xóa', example: 1 })
  @ApiResponse({ status: 200, description: 'Đã xóa đơn hàng' })
  @ApiResponse({ status: 403, description: 'Không có quyền admin' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.deleteOrderForAdmin(id);
  }
}

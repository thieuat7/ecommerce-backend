import {
  Controller,
  Get,
  Post,
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
import { CreateOrderDto } from './dto/create-order.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';

/**
 * Controller quản lý đơn hàng dành cho NGƯỜI DÙNG.
 * Prefix: /my-orders
 */
@ApiTags('My Orders (User)')
@ApiBearerAuth()
@Controller('my-orders')
@UseAuth()
export class MyOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── POST /my-orders ──────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Tạo đơn hàng mới',
    description:
      'Tạo đơn hàng từ danh sách biến thể sản phẩm. Địa chỉ giao hàng sẽ được lấy từ UserAddress và snapshot vào đơn hàng. Hệ thống tự động trừ tồn kho trong transaction an toàn.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Tạo đơn hàng thành công' })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ / sản phẩm hết hàng / ngừng kinh doanh',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa chỉ hoặc biến thể' })
  @ApiResponse({ status: 409, description: 'Xung đột hệ thống — vui lòng thử lại' })
  async create(
    @Body() dto: CreateOrderDto,
    @GetCurrentUser('userId') userId: number,
  ) {
    const order = await this.ordersService.create({ ...dto, userId });
    return {
      message:
        'Tạo đơn hàng thành công! Vui lòng thanh toán trong vòng 15 phút.',
      data: order,
    };
  }

  // ── GET /my-orders ───────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách đơn hàng của tôi',
    description:
      'Trả về toàn bộ lịch sử đơn hàng, sắp xếp theo ngày tạo mới nhất.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách đơn hàng' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  async findAll(@GetCurrentUser('userId') userId: number) {
    const orders = await this.ordersService.findAllByUserId(userId);
    return {
      message: 'Lấy danh sách đơn hàng thành công',
      total: orders.length,
      data: orders,
    };
  }

  // ── GET /my-orders/:id ───────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết đơn hàng của tôi' })
  @ApiParam({ name: 'id', description: 'ID đơn hàng', example: 1 })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('userId') userId: number,
  ) {
    const order = await this.ordersService.findOneByUserId(id, userId);
    return { message: 'Lấy chi tiết đơn hàng thành công', data: order };
  }

  // ── DELETE /my-orders/:id ────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Huỷ đơn hàng',
    description:
      'Chỉ có thể huỷ đơn hàng ở trạng thái PENDING. Đơn đã xác nhận (PROCESSING trở lên) sẽ bị từ chối.',
  })
  @ApiParam({ name: 'id', description: 'ID đơn hàng cần huỷ', example: 1 })
  @ApiResponse({ status: 200, description: 'Đã huỷ đơn hàng thành công' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Đơn hàng không ở trạng thái PENDING' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('userId') userId: number,
  ) {
    return this.ordersService.cancelByUserId(id, userId);
  }
}

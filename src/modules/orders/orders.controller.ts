import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { UpdateOrderDto } from './dto/update-order.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';
import { OrderStatus } from './enums/order-status.enum';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── TẠO ĐƠN HÀNG ─────────────────────────────────────────────────────────

  @UseAuth()
  @Post()
  @ApiOperation({
    summary: 'Tạo đơn hàng mới',
    description:
      'Tạo đơn hàng từ danh sách biến thể sản phẩm. Hệ thống sẽ validate tồn kho, trừ stock và tạo order trong một transaction duy nhất.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Tạo đơn hàng thành công' })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc sản phẩm hết hàng',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy biến thể sản phẩm' })
  @ApiResponse({
    status: 409,
    description: 'Xung đột hệ thống — vui lòng thử lại',
  })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @GetCurrentUser('userId') userId: number,
  ) {
    const order = await this.ordersService.create({
      ...createOrderDto,
      userId,
    });
    return {
      message:
        'Tạo đơn hàng thành công! Vui lòng thanh toán trong vòng 15 phút.',
      data: order,
    };
  }

  // ─── LẤY DANH SÁCH ĐƠN HÀNG CỦA TÔI ─────────────────────────────────────

  @UseAuth()
  @Get('my-orders')
  @ApiOperation({
    summary: 'Lấy danh sách đơn hàng của tôi',
    description:
      'Trả về toàn bộ lịch sử đơn hàng của người dùng đang đăng nhập, sắp xếp theo ngày tạo mới nhất.',
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

  // ─── LẤY CHI TIẾT MỘT ĐƠN HÀNG ──────────────────────────────────────────

  @UseAuth()
  @Get('my-orders/:id')
  @ApiOperation({
    summary: 'Lấy chi tiết đơn hàng của tôi',
    description:
      'Chỉ trả về đơn hàng thuộc sở hữu của người dùng đang đăng nhập.',
  })
  @ApiParam({ name: 'id', description: 'ID đơn hàng', example: 1 })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('userId') userId: number,
  ) {
    const order = await this.ordersService.findOneByIdAndUserId(id, userId);
    return {
      message: 'Lấy chi tiết đơn hàng thành công',
      data: order,
    };
  }

  // ─── CẬP NHẬT ĐƠN HÀNG (người dùng) ─────────────────────────────────────

  @UseAuth()
  @Patch('my-orders/:id')
  @ApiOperation({
    summary: 'Cập nhật địa chỉ hoặc huỷ đơn hàng',
    description:
      'Người dùng có thể cập nhật địa chỉ giao hàng hoặc huỷ đơn (status=cancelled). Không thể sửa khi đơn đã DELIVERED hoặc đã CANCELLED.',
  })
  @ApiParam({ name: 'id', description: 'ID đơn hàng', example: 1 })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền hoặc trạng thái không cho phép cập nhật',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
    @GetCurrentUser('userId') userId: number,
  ) {
    const updatedOrder = await this.ordersService.updateByIdAndUserId(
      id,
      userId,
      updateOrderDto,
    );
    return {
      message: 'Cập nhật đơn hàng thành công',
      data: updatedOrder,
    };
  }

  // ─── XÓA ĐƠN HÀNG (người dùng — chỉ khi PENDING) ────────────────────────

  @UseAuth()
  @Delete('my-orders/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa đơn hàng (chỉ khi PENDING)',
    description:
      'Chỉ có thể xóa đơn hàng ở trạng thái PENDING. Các trạng thái khác sẽ bị từ chối.',
  })
  @ApiParam({ name: 'id', description: 'ID đơn hàng', example: 1 })
  @ApiResponse({ status: 200, description: 'Đã xóa đơn hàng' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({
    status: 403,
    description: 'Đơn hàng không ở trạng thái PENDING',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('userId') userId: number,
  ) {
    return this.ordersService.removeByIdAndUserId(id, userId);
  }

  // ─── ADMIN: LẤY TẤT CẢ ĐƠN HÀNG ─────────────────────────────────────────

  @UseAuth('admin')
  @Get('admin')
  @ApiOperation({
    summary: '[Admin] Lấy tất cả đơn hàng',
    description: 'Chỉ dành cho admin. Trả về toàn bộ đơn hàng trong hệ thống.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả đơn hàng' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền admin' })
  async findAllForAdmin() {
    const orders = await this.ordersService.findAllForAdmin();
    return {
      message: 'Lấy danh sách đơn hàng thành công',
      total: orders.length,
      data: orders,
    };
  }

  // ─── ADMIN: LẤY CHI TIẾT ĐƠN HÀNG ───────────────────────────────────────

  @UseAuth('admin')
  @Get('admin/:orderId')
  @ApiOperation({ summary: '[Admin] Lấy chi tiết một đơn hàng' })
  @ApiParam({ name: 'orderId', description: 'ID đơn hàng', example: 1 })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async findOneForAdmin(@Param('orderId', ParseIntPipe) orderId: number) {
    const order = await this.ordersService.findOneForAdmin(orderId);
    return { message: 'Lấy chi tiết đơn hàng thành công', data: order };
  }

  // ─── ADMIN: CẬP NHẬT TRẠNG THÁI ─────────────────────────────────────────

  @UseAuth('admin')
  @Patch('admin/:orderId/status')
  @ApiOperation({
    summary: '[Admin] Cập nhật trạng thái đơn hàng',
    description: 'Admin có toàn quyền thay đổi trạng thái đơn hàng.',
  })
  @ApiParam({ name: 'orderId', description: 'ID đơn hàng', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: Object.values(OrderStatus),
          example: OrderStatus.PROCESSING,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  @ApiResponse({
    status: 403,
    description: 'Đơn hàng đã bị huỷ — không thể thay đổi',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async updateStatusForAdmin(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body('status') status: OrderStatus,
  ) {
    const order = await this.ordersService.updateStatusForAdmin(
      orderId,
      status,
    );
    return {
      message: `Đã cập nhật trạng thái đơn hàng thành "${status}"`,
      data: order,
    };
  }

  // ─── ADMIN: XÓA ĐƠN HÀNG ────────────────────────────────────────────────

  @UseAuth('admin')
  @Delete('admin/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Xóa đơn hàng' })
  @ApiParam({ name: 'orderId', description: 'ID đơn hàng cần xóa', example: 1 })
  @ApiResponse({ status: 200, description: 'Đã xóa đơn hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async deleteOrderForAdmin(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.ordersService.deleteOrderForAdmin(orderId);
  }
}

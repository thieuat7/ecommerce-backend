import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── TẠO ĐƠN HÀNG ─────────────────────────────────────────────────────────
  @UseAuth()
  @Post()
  @ApiOperation({ summary: 'Tạo đơn hàng mới' })
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

  // ─── LẤY DANH SÁCH ĐƠN HÀNG CỦA TÔI ────────────────────────────────────────
  @UseAuth()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng của người dùng hiện tại' })
  async findAll(@GetCurrentUser('userId') userId: number) {
    const orders = await this.ordersService.findAllByUserId(userId);
    return {
      message: 'Lấy danh sách đơn hàng thành công',
      data: orders,
    };
  }

  // ─── LẤY CHI TIẾT MỘT ĐƠN HÀNG ─────────────────────────────────────────────
  @UseAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một đơn hàng' })
  async findOne(
    @Param('id', ParseIntPipe) id: number, // ✅ Dùng ParseIntPipe để tự động ép kiểu string sang number
    @GetCurrentUser('userId') userId: number,
  ) {
    const order = await this.ordersService.findOneByIdAndUserId(id, userId);
    return {
      message: 'Lấy chi tiết đơn hàng thành công',
      data: order,
    };
  }

  // ─── CẬP NHẬT ĐƠN HÀNG ──────────────────────────────────────────────────────
  @UseAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin/trạng thái đơn hàng' })
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
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data: updatedOrder,
    };
  }

  // ─── XÓA ĐƠN HÀNG ──────────────────────────────────────────────────────────
  @UseAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đơn hàng (Chỉ khi trạng thái là PENDING)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('userId') userId: number,
  ) {
    return await this.ordersService.removeByIdAndUserId(id, userId);
  }
}

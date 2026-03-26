import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUserId } from '@common/decorators/get-current-user-id.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseAuth()
  @Post()
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @GetCurrentUserId() userId: number,
  ) {
    // Thêm await để đợi Service xử lý xong
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

  @UseAuth()
  @Get()
  async findAll(@GetCurrentUserId() userId: number) {
    const orders = await this.ordersService.findAllByUserId(userId);
    return {
      message: 'Lấy danh sách đơn hàng thành công',
      data: orders,
    };
  }

  @UseAuth()
  @Get(':id')
  async findOne(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    const order = await this.ordersService.findOneByIdAndUserId(+id, userId);
    return {
      message: 'Lấy chi tiết đơn hàng thành công',
      data: order,
    };
  }

  @UseAuth()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @GetCurrentUserId() userId: number,
  ) {
    const updatedOrder = await this.ordersService.updateByIdAndUserId(
      +id,
      userId,
      updateOrderDto,
    );
    return {
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data: updatedOrder,
    };
  }

  @UseAuth()
  @Delete(':id')
  async remove(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    // Hàm remove trong service của bạn đã trả về { message: '...' } rồi
    return await this.ordersService.removeByIdAndUserId(+id, userId);
  }
}

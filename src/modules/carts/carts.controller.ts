import { Controller, Get, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CartsService } from './carts.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';

@ApiTags('Carts')
@ApiBearerAuth()
@Controller('carts')
@UseAuth()
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  /**
   * GET /carts/my-cart
   * Lấy giỏ hàng của người dùng hiện tại (tự động tạo nếu chưa có).
   */
  @Get('my-cart')
  @ApiOperation({
    summary: 'Lấy giỏ hàng của tôi',
    description:
      'Trả về giỏ hàng kèm danh sách sản phẩm, biến thể, tổng tiền và số lượng. Tự động tạo giỏ hàng mới nếu chưa tồn tại.',
  })
  @ApiResponse({
    status: 200,
    description: 'Giỏ hàng và tổng tiền trả về thành công',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  getMyCart(@GetCurrentUser('userId') userId: number) {
    return this.cartsService.getMyCartWithTotal(userId);
  }

  /**
   * DELETE /carts/my-cart/items
   * Xóa toàn bộ sản phẩm trong giỏ hàng.
   */
  @Delete('my-cart/items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa toàn bộ sản phẩm trong giỏ hàng',
    description: 'Xóa hết tất cả cart items nhưng giữ nguyên cart object.',
  })
  @ApiResponse({
    status: 200,
    description: 'Đã xóa toàn bộ sản phẩm trong giỏ hàng',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Đã xóa 3 sản phẩm khỏi giỏ hàng',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  clearMyCart(@GetCurrentUser('userId') userId: number) {
    return this.cartsService.clearMyCart(userId);
  }
}

import {
  Controller,
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
import { CartItemsService } from './cart-items.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';

@ApiTags('Cart-Items')
@ApiBearerAuth()
@Controller('cart-items')
@UseAuth()
export class CartItemsController {
  constructor(private readonly cartItemsService: CartItemsService) {}

  /**
   * POST /cart-items
   * Thêm sản phẩm vào giỏ hàng. Nếu đã tồn tại → cộng thêm số lượng.
   */
  @Post()
  @ApiOperation({
    summary: 'Thêm sản phẩm vào giỏ hàng',
    description:
      'Thêm một sản phẩm (có hoặc không có biến thể) vào giỏ hàng của người dùng hiện tại. Nếu sản phẩm đã tồn tại trong giỏ, số lượng sẽ được cộng thêm.',
  })
  @ApiBody({ type: CreateCartItemDto })
  @ApiResponse({
    status: 201,
    description: 'Đã thêm sản phẩm vào giỏ hàng thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc sản phẩm đã ngừng kinh doanh',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy sản phẩm hoặc biến thể',
  })
  create(
    @GetCurrentUser('userId') userId: number,
    @Body() createCartItemDto: CreateCartItemDto,
  ) {
    return this.cartItemsService.create(userId, createCartItemDto);
  }

  /**
   * PATCH /cart-items/:id
   * Cập nhật số lượng của một cart item.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật số lượng sản phẩm trong giỏ hàng',
    description:
      'Thay đổi số lượng của một cart item cụ thể. Chỉ chủ sở hữu giỏ hàng mới có quyền thao tác.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của cart item cần cập nhật',
    example: 1,
  })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiResponse({
    status: 200,
    description: 'Đã cập nhật số lượng thành công',
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy cart item trong giỏ hàng của bạn',
  })
  update(
    @GetCurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartItemsService.updateItemQuantity(
      userId,
      id,
      updateCartItemDto,
    );
  }

  /**
   * DELETE /cart-items/:id
   * Xóa một sản phẩm khỏi giỏ hàng.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa sản phẩm khỏi giỏ hàng',
    description:
      'Xóa một cart item khỏi giỏ hàng của người dùng. Chỉ chủ sở hữu giỏ hàng mới có quyền xóa.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của cart item cần xóa',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Đã xóa sản phẩm khỏi giỏ hàng',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Đã xóa sản phẩm khỏi giỏ hàng',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy cart item trong giỏ hàng của bạn',
  })
  remove(
    @GetCurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cartItemsService.remove(userId, id);
  }
}

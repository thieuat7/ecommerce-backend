import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CartItemsService } from './cart-items.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';

@ApiTags('Cart-Items')
@Controller('cart-items')
@UseAuth()
export class CartItemsController {
  constructor(private readonly cartItemsService: CartItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Add product to cart' })
  create(
    @GetCurrentUser('userId') userId: number,
    @Body() createCartItemDto: CreateCartItemDto,
  ) {
    return this.cartItemsService.create(userId, createCartItemDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  update(
    @GetCurrentUser('userId') userId: number,
    @Param('id') id: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartItemsService.updateItemQuantity(userId, +id, updateCartItemDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove cart item from cart' })
  remove(@GetCurrentUser('userId') userId: number, @Param('id') id: string) {
    return this.cartItemsService.remove(userId, +id);
  }
}

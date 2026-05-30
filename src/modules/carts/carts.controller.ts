import { Controller, Get, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CartsService } from './carts.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';

@ApiTags('Carts')
@Controller('carts')
@UseAuth()
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get('my-cart')
  @ApiOperation({ summary: 'Get current user cart' })
  getMyCart(@GetCurrentUser('userId') userId: number) {
    return this.cartsService.getMyCart(userId);
  }

  @Delete('my-cart/items')
  @ApiOperation({ summary: 'Clear all items in cart' })
  clearMyCart(@GetCurrentUser('userId') userId: number) {
    return this.cartsService.clearMyCart(userId);
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItemsService } from './cart-items.service';
import { CartItemsController } from './cart-items.controller';
import { CartItem } from './entities/cart-item.entity';
import { CartsModule } from '@modules/carts/carts.module';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem]), CartsModule],
  controllers: [CartItemsController],
  providers: [CartItemsService],
})
export class CartItemsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItemsService } from './cart-items.service';
import { CartItemsController } from './cart-items.controller';
import { CartItem } from './entities/cart-item.entity';
import { CartsModule } from '@modules/carts/carts.module';
import { Product } from '@modules/products/entities/product.entity';
import { ProductVariant } from '@modules/variant/entities/product-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartItem, Product, ProductVariant]),
    CartsModule,
  ],
  controllers: [CartItemsController],
  providers: [CartItemsService],
  exports: [CartItemsService],
})
export class CartItemsModule {}

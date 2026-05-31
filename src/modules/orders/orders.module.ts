import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from '@modules/order-items/entities/order-item.entity';
import { ProductVariant } from '@modules/variant/entities/product-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, ProductVariant]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

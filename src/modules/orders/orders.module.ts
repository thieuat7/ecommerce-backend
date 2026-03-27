import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from '@modules/order-items/entities/order-item.entity';
import { Product } from '@modules/products/entities/product.entity';
import { Payment } from '@modules/payments/entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, Payment])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

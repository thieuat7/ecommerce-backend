import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { MyOrdersController } from './my-orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from '@modules/order-items/entities/order-item.entity';
import { ProductVariant } from '@modules/variant/entities/product-variant.entity';
import { UserAddress } from '@modules/user-addresses/entities/user-address.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, ProductVariant, UserAddress]),
  ],
  controllers: [MyOrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

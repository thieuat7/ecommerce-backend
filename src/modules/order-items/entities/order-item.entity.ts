import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Order } from '@modules/orders/entities/order.entity';
import { Product } from '@modules/products/entities/product.entity';

@Entity('order_items')
// Cập nhật tên thuộc tính trong mảng Unique để khớp với biến trong Class
@Unique('UQ_order_product', ['order', 'product'])
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'int',
  })
  quantity: number;

  @Column({
    name: 'price_at_purchase', // Giữ snake_case cho DB
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  priceAtPurchase: number; // Chuyển sang camelCase cho TypeScript

  @CreateDateColumn({
    name: 'created_at', // Giữ snake_case cho DB
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date; // Chuyển sang camelCase cho TypeScript

  // ===============================
  // QUAN HỆ (RELATIONS)
  // ===============================

  // Liên kết ngược lại với Order
  // Lưu ý: Đảm bảo bên Entity Order bạn cũng đổi 'order_items' thành 'orderItems'
  @ManyToOne((): typeof Order => Order, (order: Order) => order.orderItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // Liên kết với Product
  @ManyToOne(() => Product, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}

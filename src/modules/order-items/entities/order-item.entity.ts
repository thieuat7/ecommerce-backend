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
import { ProductVariant } from '@modules/variant/entities/product-variant.entity';

@Entity('order_items')
@Unique('UQ_order_product_variant', ['order', 'product', 'variant'])
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  quantity: number;

  /**
   * Giá tại thời điểm mua — snapshot để tránh bị ảnh hưởng khi giá sản phẩm thay đổi sau này.
   * Ưu tiên lấy từ variant.price, nếu variant null thì lấy product.price.
   */
  @Column({
    name: 'price_at_purchase',
    type: 'decimal',
    precision: 14,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  priceAtPurchase: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  // ===============================
  // QUAN HỆ (RELATIONS)
  // ===============================

  @ManyToOne((): typeof Order => Order, (order: Order) => order.orderItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  /**
   * Sản phẩm gốc (luôn có — để tra cứu thông tin sản phẩm dù variant có thể bị xóa)
   */
  @ManyToOne(() => Product, { onDelete: 'NO ACTION', nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  /**
   * Biến thể sản phẩm (nullable — sản phẩm không bắt buộc phải có biến thể)
   */
  @ManyToOne(() => ProductVariant, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant | null;
}

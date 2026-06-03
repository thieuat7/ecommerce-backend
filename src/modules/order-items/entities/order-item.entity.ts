import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '@modules/orders/entities/order.entity';
import { Product } from '@modules/products/entities/product.entity';
import { ProductVariant } from '@modules/variant/entities/product-variant.entity';

/**
 * Migration check constraint (XOR):
 *   ((product_id IS NOT NULL AND variant_id IS NULL)
 *    OR (product_id IS NULL AND variant_id IS NOT NULL))
 *
 * → Mỗi order item chỉ tham chiếu đến MỘT trong hai:
 *   • product  → dành cho sản phẩm không có biến thể
 *   • variant  → dành cho sản phẩm có biến thể (variant đã có product_id bên trong)
 */
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  quantity: number;

  /**
   * Giá tại thời điểm mua — snapshot, không bị ảnh hưởng khi giá thay đổi sau.
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

  /**
   * Snapshot tên sản phẩm — đảm bảo hiển thị đúng dù product bị đổi tên sau.
   */
  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName: string;

  /**
   * Snapshot tên biến thể — VD: "Space Gray / 128GB".
   * NULL nếu sản phẩm không có biến thể.
   */
  @Column({ name: 'variant_name', type: 'varchar', length: 255, nullable: true })
  variantName: string | null;

  /**
   * Snapshot SKU của biến thể tại thời điểm mua.
   * NULL nếu sản phẩm không có biến thể.
   */
  @Column({ name: 'sku', type: 'varchar', length: 100, nullable: true })
  sku: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Order, (order) => order.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  /**
   * Tham chiếu sản phẩm gốc (nullable — NULL khi item thuộc variant).
   * Dùng onDelete: RESTRICT để không xóa product khi còn order item tham chiếu.
   */
  @ManyToOne(() => Product, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  /**
   * Tham chiếu biến thể (nullable — NULL khi item thuộc product trực tiếp).
   * Dùng onDelete: RESTRICT để không xóa variant khi còn order item tham chiếu.
   */
  @ManyToOne(() => ProductVariant, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant | null;
}

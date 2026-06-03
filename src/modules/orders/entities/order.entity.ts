import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { OrderItem } from '@modules/order-items/entities/order-item.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { Payment } from '@modules/payments/entities/payment.entity';
import { UserAddress } from '@modules/user-addresses/entities/user-address.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_code', type: 'varchar', length: 50, unique: true })
  orderCode: string;

  /** FK tới user — lưu dưới dạng column để query nhanh */
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  /**
   * FK tới user_address — nullable vì address có thể bị xóa sau khi đặt hàng.
   * Dữ liệu địa chỉ thực tế dùng snapshot (shippingAddress, customerName, customerPhone).
   */
  @Column({ name: 'user_address_id', type: 'int', nullable: true })
  userAddressId: number | null;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalAmount: number;

  /**
   * Snapshot họ tên người nhận tại thời điểm đặt hàng.
   * Không bị ảnh hưởng khi user thay đổi thông tin sau này.
   */
  @Column({ name: 'customer_name', type: 'varchar', length: 100, nullable: true })
  customerName: string | null;

  /** Snapshot số điện thoại người nhận */
  @Column({ name: 'customer_phone', type: 'varchar', length: 20, nullable: true })
  customerPhone: string | null;

  /**
   * Snapshot địa chỉ đầy đủ dạng text (được ghép từ UserAddress lúc đặt hàng).
   * VD: "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh, Vietnam"
   */
  @Column({ name: 'shipping_address', type: 'text' })
  shippingAddress: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

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

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Tham chiếu tới địa chỉ gốc (SET NULL khi địa chỉ bị xóa).
   * Chỉ dùng để tra cứu, không dùng để hiển thị (dùng snapshot).
   */
  @ManyToOne(() => UserAddress, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_address_id' })
  userAddress: UserAddress | null;

  @OneToOne(() => Payment, (payment) => payment.order)
  payment: Payment;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  orderItems: OrderItem[];
}

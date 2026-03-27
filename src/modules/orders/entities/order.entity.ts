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
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'order_code',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  orderCode: string;

  // Sử dụng DECIMAL để lưu tiền tệ chính xác.
  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    name: 'shipping_address',
    type: 'text',
  })
  shippingAddress: string;

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

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  deletedAt: Date;

  // ===============================
  // QUAN HỆ (RELATIONS)
  // ===============================

  // Quan hệ N-1 với User
  // Đảm bảo bên User entity, property cũng là 'orders'
  @ManyToOne((): typeof User => User, (user: User) => user.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToOne(() => Payment, (payment) => payment.order)
  payment: Payment;

  // Quan hệ 1-N với OrderItem
  @OneToMany(
    (): typeof OrderItem => OrderItem,
    (orderItem: OrderItem) => orderItem.order,
    { cascade: true },
  )
  orderItems: OrderItem[];
}

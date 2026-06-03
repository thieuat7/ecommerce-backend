import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';

@Entity('user_addresses')
@Index('IDX_user_addresses_user_id', ['userId'])
export class UserAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  /**
   * Nhãn phân loại địa chỉ: 'Nhà riêng', 'Văn phòng', 'Kho hàng'...
   */
  @Column({ type: 'varchar', length: 50 })
  label: string;

  /** Họ tên người nhận hàng */
  @Column({ name: 'recipient_name', type: 'varchar', length: 100 })
  recipientName: string;

  /** Số điện thoại liên lạc khi giao hàng */
  @Column({ name: 'phone_number', type: 'varchar', length: 20 })
  phoneNumber: string;

  /** Số nhà, tên đường, tòa nhà, tầng... */
  @Column({ name: 'address_line', type: 'varchar', length: 255 })
  addressLine: string;

  /** Phường / Xã */
  @Column({ type: 'varchar', length: 100, nullable: true })
  ward: string | null;

  /** Quận / Huyện */
  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  /** Tỉnh / Thành phố */
  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  /** Quốc gia (mặc định: Vietnam) */
  @Column({ type: 'varchar', length: 100, default: 'Vietnam' })
  country: string;

  /** Mã bưu chính */
  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode: string | null;

  /**
   * Đánh dấu địa chỉ mặc định của user.
   * Khi set is_default=true thì service phải reset tất cả địa chỉ khác của user về false.
   */
  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  /** Ghi chú thêm cho shipper */
  @Column({ type: 'text', nullable: true })
  note: string | null;

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
  deletedAt: Date | null;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

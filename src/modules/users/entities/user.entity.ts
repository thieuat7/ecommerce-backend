import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
  ManyToMany,
  JoinTable,
  BeforeInsert,
  Index,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Order } from '@modules/orders/entities/order.entity';
import { Role } from '@modules/roles/entities/role.entity';
import { UserAddress } from '@modules/user-addresses/entities/user-address.entity';
import { Cart } from '@modules/carts/entities/cart.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'public_id',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  publicId: string;

  @BeforeInsert()
  generatePublicId() {
    if (!this.publicId) {
      this.publicId = uuidv4();
    }
  }

  @Index()
  @Column({
    name: 'full_name',
    type: 'varchar',
    length: 100,
  })
  fullName: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  password: string;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  phoneNumber: string;

  @Column({
    name: 'current_hashed_refresh_token',
    type: 'text',
    nullable: true,
    select: false,
  })
  currentHashedRefreshToken: string | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date;

  // ===============================
  // QUAN HỆ (RELATIONS)
  // ===============================

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => UserAddress, (address) => address.user)
  addresses: UserAddress[];

  // @OneToMany(() => UserAuthProvider, (authProvider) => authProvider.user)
  // authProviders: UserAuthProvider[];

  /**
   * Giỏ hàng duy nhất của user (lazy — không load tự động).
   * @JoinColumn đặt ở phía Cart (carts.user_id), nên User chỉ khai báo inverse side.
   */
  @OneToOne(() => Cart, (cart) => cart.user)
  cart: Cart;
}


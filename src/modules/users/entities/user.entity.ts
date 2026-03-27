import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  BeforeInsert,
  Unique,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Order } from '@modules/orders/entities/order.entity';
import { Role } from '@modules/roles/entities/role.entity';

// Enum cho nguồn đăng nhập
export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
}

@Unique(['authProvider', 'providerId'])
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'public_id',
    type: 'uuid',
    unique: true,
  })
  publicId: string;

  @BeforeInsert()
  generatePublicId() {
    if (!this.publicId) {
      this.publicId = uuidv4();
    }
  }

  @Column({
    name: 'full_name',
    type: 'varchar',
    length: 100,
  })
  fullName: string;

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
    name: 'auth_provider',
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Column({
    name: 'provider_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerId: string;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  phoneNumber: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  address: string;

  @Column({
    name: 'current_hashed_refresh_token',
    type: 'text',
    nullable: true,
    select: false,
  })
  currentHashedRefreshToken: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date;

  // ===============================
  // QUAN HỆ (RELATIONS)
  // ===============================

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @ManyToMany((): typeof Role => Role, (role: Role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];
}

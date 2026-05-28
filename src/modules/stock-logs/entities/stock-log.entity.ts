// stock-log.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Product } from '@modules/products/entities/product.entity';
import { ProductVariant } from '@modules/variant/entities/product-variant.entity';
import { User } from '@modules/users/entities/user.entity';
import { StockLogAction } from '../enums/stock-log-action.enum';

@Entity('stock_logs')
@Index('product_id')
@Index('variant_id')
@Index('changed_by_user_id')
export class StockLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @Column({ name: 'variant_id', type: 'int', nullable: true })
  variantId: number | null;

  @Column({ name: 'changed_by_user_id', type: 'int', nullable: true })
  changedByUserId: number | null;

  @Column({
    type: 'enum',
    enum: StockLogAction,
    nullable: false,
  })
  action: StockLogAction;

  @Column({ name: 'quantity_change', type: 'int' })
  quantityChange: number;

  @Column({ name: 'before_quantity', type: 'int' })
  beforeQuantity: number;

  @Column({ name: 'after_quantity', type: 'int' })
  afterQuantity: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

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

  // ===============================
  // RELATIONS
  // ===============================
  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedByUser: User | null;
}

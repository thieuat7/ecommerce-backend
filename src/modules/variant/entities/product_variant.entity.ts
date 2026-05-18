// product-variant.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ValueTransformer } from 'typeorm';
import { Product } from '@modules/products/entities/product.entity';
import { ProductVariantOption } from './product-variant-option.entity';
import { ProductImage } from '@modules/products/entities/product-image.entity';
import { StockLog } from '@modules/stock-logs/entities/stock-log.entity';

export const DecimalTransformer: ValueTransformer = {
  to: (value?: number) => value,
  from: (value?: string | number): number => {
    if (typeof value === 'number') return value;
    return value ? parseFloat(value) : 0;
  },
};

@Entity('product_variants')
@Unique(['product_id', 'option_hash'])
@Index('product_id')
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku: string;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    transformer: DecimalTransformer,
  })
  price: number;

  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ type: 'int', default: 0 })
  version: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'option_hash', type: 'varchar', nullable: false })
  optionHash: string;

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

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(
    () => ProductVariantOption,
    (option: ProductVariantOption) => option.variant,
  )
  options: ProductVariantOption[];

  @OneToMany(() => ProductImage, (image) => image.variant)
  images: ProductImage[];

  @OneToMany(() => StockLog, (log) => log.variant)
  stockLogs: StockLog[];
}

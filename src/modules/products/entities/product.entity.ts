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
  BeforeInsert,
} from 'typeorm';
import { Category } from '@modules/categories/entities/category.entity';
import { ProductImage } from './product-image.entity';
import { v4 as uuidv4 } from 'uuid';
import { ProductAttribute } from './product-attribute.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'varchar', length: 50, unique: true })
  publicId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  price: number;

  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean; // Thêm is_active theo Migration

  @Column({ type: 'int', default: 0 })
  version: number;

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

  @Column({ name: 'category_id', nullable: true })
  categoryId: number | null;

  // Quan hệ với Category
  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  // Quan hệ với ProductAttribute
  @OneToMany(() => ProductAttribute, (attr) => attr.product)
  attributes: ProductAttribute[];
  // QUAN HỆ MỚI: Một sản phẩm có nhiều ảnh
  @OneToMany(() => ProductImage, (image) => image.product)
  images: ProductImage[];

  @BeforeInsert()
  generatePublicId() {
    this.publicId = uuidv4();
  }
}

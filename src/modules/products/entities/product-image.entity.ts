import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { ProductVariant } from '@modules/variant/entities/product-variant.entity';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  /** null = ảnh cấp sản phẩm; có giá trị = ảnh của variant cụ thể */
  @Column({ name: 'variant_id', type: 'int', nullable: true })
  variantId: number | null;

  @Column({ name: 'image_url', type: 'varchar', length: 255 })
  imageUrl: string;

  @Column({ name: 'alt_text', type: 'varchar', length: 255, nullable: true })
  altText: string | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Product, (product) => product.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => ProductVariant, (variant) => variant.images, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant | null;
}

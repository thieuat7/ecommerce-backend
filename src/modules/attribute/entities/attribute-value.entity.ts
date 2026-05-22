// attribute-value.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Attribute } from './attribute.entity';
import { ProductVariantOption } from '@modules/variant/entities/product-variant-option.entity';

@Entity('attribute_values')
@Unique(['attributeId', 'value'])
export class AttributeValue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'attribute_id', type: 'int' })
  attributeId: number;

  @Column({ type: 'varchar', length: 255 })
  value: string; // 'red', '64GB'

  @Column({ name: 'display_value', type: 'varchar', length: 255 })
  displayValue: string; // 'Đỏ', '64 GB'

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

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
  @ManyToOne(() => Attribute, (attribute) => attribute.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attribute_id' })
  attribute: Attribute;

  @OneToMany(() => ProductVariantOption, (pvo) => pvo.attributeValue)
  productVariantOptions: ProductVariantOption[];
}

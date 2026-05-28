import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { AttributeValue } from '@modules/attribute/entities/attribute-value.entity';

@Entity('product_variant_options')
@Unique(['variantId', 'attributeValueId'])
@Index('variantId')
export class ProductVariantOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'variant_id', type: 'int' })
  variantId: number;

  @Column({ name: 'attribute_value_id', type: 'int' })
  attributeValueId: number;

  // ===============================
  // RELATIONS
  // ===============================
  @ManyToOne(() => ProductVariant, (variant) => variant.options, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @ManyToOne(
    () => AttributeValue,
    (attrValue) => attrValue.productVariantOptions,
    {
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'attribute_value_id' })
  attributeValue: AttributeValue;
}

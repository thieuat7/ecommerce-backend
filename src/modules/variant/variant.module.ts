import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VariantService } from './variant.service';
import { VariantController } from './variant.controller';
import { ProductVariant } from './entities/product_variant.entity';
import { ProductVariantOption } from './entities/product-variant-option.entity';
import { ProductImage } from '@modules/products/entities/product-image.entity';
import { StockLog } from '@modules/stock-logs/entities/stock-log.entity';
import { AttributeValue } from '@modules/attribute/entities/attribute-value.entity';
import { Product } from '@modules/products/entities/product.entity';
import { ProductsModule } from '@modules/products/products.module';
import { AttributeModule } from '@modules/attribute/attribute.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductVariant,
      ProductVariantOption,
      ProductImage,
      StockLog,
      AttributeValue,
      Product,
    ]),
    ProductsModule,
    AttributeModule,
  ],
  controllers: [VariantController],
  providers: [VariantService],
  exports: [VariantService],
})
export class VariantModule {}

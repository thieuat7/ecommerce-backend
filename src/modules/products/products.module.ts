import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AdminProductsController } from './admin-products.controller';
import { ProductReportService } from './product-report.service';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Category } from '@modules/categories/entities/category.entity';
import { ProductVariant } from '@modules/variant/entities/product-variant.entity';
import { ProductVariantOption } from '@modules/variant/entities/product-variant-option.entity';
import { StockLog } from '@modules/stock-logs/entities/stock-log.entity';
import { AttributeValue } from '@modules/attribute/entities/attribute-value.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductImage,
      Category,
      ProductVariant,
      ProductVariantOption,
      StockLog,
      AttributeValue,
    ]),
  ],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService, ProductReportService],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}

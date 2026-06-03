import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Product } from './entities/product.entity';

export interface ProductSummary {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  deletedProducts: number;
}

export interface ProductStats {
  message: string;
  availableMetrics: string[];
}

@Injectable()
export class ProductReportService {
  private readonly logger = new Logger(ProductReportService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async getSummary(): Promise<ProductSummary> {
    const [totalProducts, activeProducts, deletedProducts] = await Promise.all([
      // TypeORM @DeleteDateColumn automatically excludes soft-deleted rows
      this.productRepo.count(),
      this.productRepo.count({ where: { isActive: true } }),
      // withDeleted: true includes soft-deleted rows; subtract non-deleted count
      this.productRepo.count({
        where: { deletedAt: Not(IsNull()) },
        withDeleted: true,
      }),
    ]);

    const inactiveProducts = totalProducts - activeProducts;

    this.logger.debug(
      `Product summary — total:${totalProducts} active:${activeProducts} inactive:${inactiveProducts} deleted:${deletedProducts}`,
    );

    return { totalProducts, activeProducts, inactiveProducts, deletedProducts };
  }

  // Stub — expand when analytics requirements are defined
  getStats(): ProductStats {
    return {
      message: 'Stats endpoint reserved for future analytics expansion.',
      availableMetrics: [
        'topSellingProducts',
        'revenueByCategory',
        'lowStockVariants',
        'productCreationTrend',
      ],
    };
  }
}

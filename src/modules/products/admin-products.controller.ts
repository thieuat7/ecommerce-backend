import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { ProductReportService } from './product-report.service';
import type { ProductSummary, ProductStats } from './product-report.service';

@ApiTags('Admin — Products')
@Controller('admin/products')
@UseAuth('admin')
export class AdminProductsController {
  constructor(private readonly productReportService: ProductReportService) {}

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tổng quan sản phẩm (Admin only)',
    description:
      'Trả về tổng số sản phẩm, số đang hoạt động, số không hoạt động, và số đã xóa mềm.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    schema: {
      example: {
        totalProducts: 120,
        activeProducts: 95,
        inactiveProducts: 25,
        deletedProducts: 8,
      },
    },
  })
  getSummary(): Promise<ProductSummary> {
    return this.productReportService.getSummary();
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Thống kê sản phẩm nâng cao — stub (Admin only)',
    description:
      'Placeholder endpoint. Liệt kê các metrics sẽ khả dụng trong phiên bản tiếp theo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách metrics dự kiến',
  })
  getStats(): ProductStats {
    return this.productReportService.getStats();
  }
}

// stock-log.controller.ts
import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';

import { StockLogsService } from './stock-logs.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { FilterStockLogDto } from './dto/filter-stock-log.dto';

@Controller('stock-logs')
export class StockLogController {
  constructor(private readonly stockLogService: StockLogsService) {}

  // ==========================================
  // LIST + FILTER + PAGINATION
  // ==========================================
  @Get()
  @UseAuth('ADMIN')
  async findAll(@Query() filter: FilterStockLogDto) {
    return this.stockLogService.findAll(filter);
  }

  // ==========================================
  // DETAIL (MUST đặt trước dynamic route nếu cần mở rộng sau)
  // ==========================================
  @Get('detail/:id')
  @UseAuth('ADMIN')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stockLogService.findOne(id);
  }

  // ==========================================
  // BY PRODUCT
  // ==========================================
  @Get('product/:productId')
  @UseAuth('ADMIN')
  async findByProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Query() filter: FilterStockLogDto,
  ) {
    return this.stockLogService.findByProduct(productId, filter);
  }

  // ==========================================
  // BY VARIANT
  // ==========================================
  @Get('variant/:variantId')
  @UseAuth('ADMIN')
  async findByVariant(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Query() filter: FilterStockLogDto,
  ) {
    return this.stockLogService.findByVariant(variantId, filter);
  }
}

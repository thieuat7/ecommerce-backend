// stock-log.controller.ts
import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { StockLogsService } from './stock-logs.service';
import { StockLog } from './entities/stock-log.entity';
import { StockLogAction } from './enums/stock-log-action.enum';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { FilterStockLogDto } from './dto/filter-stock-log.dto';

@Controller('stock-logs')
// @UseGuards(AuthGuard('jwt'), RolesGuard) // Bật nếu cần xác thực
export class StockLogController {
  constructor(private readonly stockLogService: StockLogsService) {}

  /**
   * Lấy danh sách logs có phân trang và lọc
   */
  @Get()
  @UseAuth('ADMIN')
  // @Roles(UserRole.ADMIN, UserRole.MANAGER) // Ví dụ phân quyền
  async findAll(@Query() filter: FilterStockLogDto) {
    return this.stockLogService.findAll(filter);
  }

  /**
   * Lấy chi tiết một log theo ID
   */
  @Get(':id')
  @UseAuth('ADMIN')
  // @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stockLogService.findOne(id);
  }

  /**
   * Lấy logs theo sản phẩm (tiện ích, có thể gọi qua filter thông thường)
   */
  @Get('product/:productId')
  @UseAuth('ADMIN')
  async findByProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Query() filter: FilterStockLogDto,
  ) {
    return this.stockLogService.findAll({ ...filter, productId });
  }

  /**
   * Lấy logs theo biến thể
   */
  @Get('variant/:variantId')
  @UseAuth('ADMIN')
  async findByVariant(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Query() filter: FilterStockLogDto,
  ) {
    return this.stockLogService.findAll({ ...filter, variantId });
  }
}

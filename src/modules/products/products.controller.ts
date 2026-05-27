import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductsService, PaginatedResult } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import {
  AddProductImageDto,
  UpdateImageOrderDto,
} from './dto/product-image.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ══════════════════════════════════════════════
  //  PUBLIC ROUTES
  // ══════════════════════════════════════════════

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách sản phẩm (lọc + phân trang)' })
  findAll(
    @Query() filterDto: FilterProductDto,
  ): Promise<PaginatedResult<Product>> {
    return this.productsService.findAll(filterDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chi tiết sản phẩm (kèm variants, images, categories)',
  })
  @ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Product> {
    return this.productsService.findOne(id);
  }

  // ══════════════════════════════════════════════
  //  ADMIN ONLY ROUTES
  // ══════════════════════════════════════════════

  @Post()
  @UseAuth('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo sản phẩm mới (Admin only)' })
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productsService.create(dto);
  }

  @Put(':id')
  @UseAuth('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật sản phẩm (Admin only) – Cần gửi version hiện tại',
  })
  @ApiResponse({
    status: 409,
    description: 'Xung đột phiên bản (optimistic lock)',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseAuth('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa mềm sản phẩm (Admin only)' })
  softDelete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.productsService.softDelete(id);
  }

  // ── Quản lý categories ──────────────────────────────────────────────────────

  @Post(':id/categories')
  @UseAuth('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gắn category vào sản phẩm (Admin only)' })
  addCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<Product> {
    return this.productsService.addCategory(id, categoryId);
  }

  @Delete(':id/categories/:categoryId')
  @UseAuth('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gỡ category khỏi sản phẩm (Admin only)' })
  removeCategory(
    @Param('id', ParseIntPipe) id: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<Product> {
    return this.productsService.removeCategory(id, categoryId);
  }

  // ── Quản lý ảnh (cấp product) ───────────────────────────────────────────────

  @Post(':id/images')
  @UseAuth('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Thêm ảnh vào sản phẩm (variant_id = null)' })
  addImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddProductImageDto,
  ): Promise<ProductImage> {
    return this.productsService.addImage(id, dto);
  }

  @Delete('images/:imageId')
  @UseAuth('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa ảnh sản phẩm' })
  removeImage(
    @Param('imageId', ParseIntPipe) imageId: number,
  ): Promise<{ message: string }> {
    return this.productsService.removeImage(imageId);
  }

  @Patch('images/:imageId/order')
  @UseAuth('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật thứ tự hiển thị ảnh' })
  updateImageOrder(
    @Param('imageId', ParseIntPipe) imageId: number,
    @Body() dto: UpdateImageOrderDto,
  ): Promise<ProductImage> {
    return this.productsService.updateImageOrder(imageId, dto);
  }
}

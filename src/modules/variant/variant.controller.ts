import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { File as MulterFile } from 'multer';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VariantService } from './variant.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { AddProductImageDto } from '@modules/products/dto/product-image.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';

@ApiTags('Variants')
@Controller()
export class VariantController {
  constructor(private readonly variantService: VariantService) {}

  // ══════════════════════════════════════════════
  //  PUBLIC ROUTES
  // ══════════════════════════════════════════════

  @Get('products/:productId/variants')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Danh sách variants của sản phẩm (kèm options & images)',
  })
  findByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.variantService.findByProduct(productId);
  }

  @Get('variants/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chi tiết variant (kèm options, images, 10 stock logs gần nhất)',
  })
  @ApiResponse({ status: 404, description: 'Variant không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.variantService.findOne(id);
  }

  // ══════════════════════════════════════════════
  //  ADMIN ONLY ROUTES
  // ══════════════════════════════════════════════

  @Post('products/:productId/variants')
  @UseAuth('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo variant mới cho sản phẩm (Admin only)',
    description:
      'Tự động tính option_hash, sinh SKU nếu trống, ghi stock_log nếu stockQuantity > 0',
  })
  @ApiResponse({
    status: 409,
    description: 'Tổ hợp attributes hoặc SKU đã tồn tại',
  })
  @UseInterceptors(FilesInterceptor('images', 5))
  create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateVariantDto,
    @UploadedFiles() files: MulterFile[],
    @GetCurrentUser('userId') userId?: number,
  ) {
    console.log('Received files:', dto);
    return this.variantService.create(productId, dto, files, userId);
  }

  @Put('variants/:id')
  @UseAuth('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật variant (Admin only) – Cần gửi version hiện tại',
    description: 'Thay đổi stock_quantity sẽ tự động ghi stock_log',
  })
  @ApiResponse({
    status: 409,
    description: 'Xung đột phiên bản (optimistic lock)',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVariantDto,
    @GetCurrentUser('userId') userId?: number,
  ) {
    return this.variantService.update(id, dto, userId);
  }

  @Delete('variants/:id')
  @UseAuth('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa variant (Admin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.variantService.remove(id);
  }

  // ── Quản lý ảnh variant ─────────────────────────────────────────────────────

  @Post('variants/:id/images')
  @UseAuth('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Thêm ảnh cho variant (Admin only)' })
  addImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddProductImageDto,
  ) {
    return this.variantService.addImage(id, dto);
  }

  @Delete('variants/images/:imageId')
  @UseAuth('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa ảnh variant (Admin only)' })
  removeImage(@Param('imageId', ParseIntPipe) imageId: number) {
    return this.variantService.removeImage(imageId);
  }
}

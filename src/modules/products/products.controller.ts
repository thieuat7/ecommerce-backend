import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { Product } from './entities/product.entity';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ---------------- PUBLIC ROUTES ----------------
  // Bất kỳ ai cũng có thể xem sản phẩm (Không dùng @UseAuth)

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách tất cả sản phẩm' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm' })
  findAll(): Promise<Product[]> {
    return this.productsService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thông tin một sản phẩm theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin sản phẩm' })
  @ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Product> {
    return this.productsService.findOne(id);
  }

  // ---------------- ADMIN ONLY ROUTES ----------------
  // Chỉ tài khoản có role 'admin' mới được thực hiện

  @UseAuth('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo sản phẩm mới (Admin only)' })
  @ApiResponse({ status: 201, description: 'Sản phẩm được tạo thành công' })
  @ApiResponse({
    status: 403,
    description: 'Bạn không có quyền thực hiện hành động này',
  })
  create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  @UseAuth('admin')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật thông tin sản phẩm theo ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, updateProductDto);
  }

  @UseAuth('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa sản phẩm theo ID (Admin only)' })
  @ApiResponse({ status: 204, description: 'Xóa thành công' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.productsService.remove(id);
  }
}

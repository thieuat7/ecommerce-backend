import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProductsService, PaginatedProducts } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
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
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm (có phân trang)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách sản phẩm kèm thông tin phân trang',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Trang hiện tại (mặc định 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số sản phẩm mỗi trang (mặc định 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Lọc theo ID danh mục',
    example: 2,
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('categoryId') categoryId?: number,
  ): Promise<PaginatedProducts> {
    return this.productsService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      categoryId ? Number(categoryId) : undefined,
    );
  }

  @Get('filter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lọc & tìm kiếm sản phẩm (có phân trang)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách sản phẩm đã lọc kèm thông tin phân trang',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Tìm theo tên sản phẩm',
  })
  @ApiQuery({ name: 'categoryId', required: false, description: 'ID danh mục' })
  @ApiQuery({ name: 'minPrice', required: false, description: 'Giá tối thiểu' })
  @ApiQuery({ name: 'maxPrice', required: false, description: 'Giá tối đa' })
  @ApiQuery({
    name: 'minStock',
    required: false,
    description: 'Tồn kho tối thiểu',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['price', 'name', 'createdAt', 'stockQuantity'],
    description: 'Trường sắp xếp',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Chiều sắp xếp',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Trang (mặc định 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số bản ghi/trang (mặc định 10)',
  })
  filterProducts(
    @Query() filterDto: FilterProductDto,
  ): Promise<PaginatedProducts> {
    return this.productsService.findWithFilter(filterDto);
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

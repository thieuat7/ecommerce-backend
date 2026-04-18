import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  // ─── TẠO MỚI SẢN PHẨM ──────────────────────────────────────────────────────
  async create(dto: CreateProductDto): Promise<Product> {
    const { categoryId, ...productData } = dto;

    // Khởi tạo instance từ Entity
    // publicId sẽ tự sinh nhờ @BeforeInsert trong Entity
    const product = this.productRepository.create({
      ...productData,
      category: { id: categoryId }, // Gán quan hệ qua ID
    });

    return await this.productRepository.save(product);
  }

  // ─── LẤY DANH SÁCH SẢN PHẨM (CÓ PHÂN TRANG) ───────────────────────────────
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedProducts> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.productRepository.findAndCount({
      relations: ['category'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── LỌC & TÌM KIẾM SẢN PHẨM (CÓ PHÂN TRANG) ────────────────────────────
  async findWithFilter(dto: FilterProductDto): Promise<PaginatedProducts> {
    const {
      name,
      categoryId,
      minPrice,
      maxPrice,
      minStock,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 10,
    } = dto;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.deletedAt IS NULL');

    // Tìm kiếm theo tên (không phân biệt hoa thường)
    if (name) {
      qb.andWhere('LOWER(product.name) LIKE LOWER(:name)', {
        name: `%${name}%`,
      });
    }

    // Lọc theo danh mục
    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    // Lọc theo khoảng giá
    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    // Lọc theo tồn kho tối thiểu
    if (minStock !== undefined) {
      qb.andWhere('product.stockQuantity >= :minStock', { minStock });
    }

    // Sắp xếp
    const sortField = `product.${sortBy}`;
    qb.orderBy(sortField, sortOrder);

    // Phân trang
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── LẤY CHI TIẾT THEO ID (NỘI BỘ) ────────────────────────────────────────
  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với id=${id}`);
    }

    return product;
  }

  // ─── LẤY CHI TIẾT THEO PUBLIC ID (API NGOÀI) ──────────────────────────────
  async findByPublicId(publicId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { publicId },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Sản phẩm với mã ${publicId} không tồn tại`);
    }

    return product;
  }

  // ─── CẬP NHẬT SẢN PHẨM ─────────────────────────────────────────────────────
  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    const { categoryId, ...updateData } = dto;

    // Nếu có cập nhật categoryId, ta gán object chứa ID và ép kiểu 'as any'
    // Điều này giúp TypeORM hiểu bạn muốn cập nhật khóa ngoại mà không cần load cả Entity Category
    if (categoryId) {
      product.categoryId = categoryId;
    }

    // Merge các thay đổi từ DTO vào thực thể hiện tại (camelCase tự động được giữ nguyên)
    const updatedProduct = this.productRepository.merge(product, updateData);

    return await this.productRepository.save(updatedProduct);
  }

  // ─── XÓA SẢN PHẨM (SOFT DELETE) ───────────────────────────────────────────
  async remove(id: number): Promise<{ message: string }> {
    const product = await this.findOne(id);

    // Sử dụng softRemove để kích hoạt @DeleteDateColumn (lưu lại deletedAt)
    await this.productRepository.softRemove(product);

    return { message: 'Đã xóa sản phẩm thành công' };
  }
}

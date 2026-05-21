import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Category } from '@modules/categories/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import {
  AddProductImageDto,
  UpdateImageOrderDto,
} from './dto/product-image.dto';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  // ─── HELPER: Sinh slug unique ─────────────────────────────────────────────

  private async generateUniqueSlug(
    name: string,
    excludeId?: number,
  ): Promise<string> {
    // FIX: Sử dụng String() để ép kiểu kết quả của slugify một cách an toàn
    const base = String(
      slugify(name, { lower: true, strict: true, locale: 'vi' }),
    );
    let slug = base;
    let suffix = 1;

    while (true) {
      const qb = this.productRepo
        .createQueryBuilder('p')
        .where('p.slug = :slug', { slug })
        .withDeleted();

      if (excludeId) {
        qb.andWhere('p.id != :id', { id: excludeId });
      }

      const exists = await qb.getOne();
      if (!exists) break;

      // FIX: Ép kiểu string khi cộng chuỗi
      slug = String(`${base}-${suffix++}`);
    }

    return slug;
  }

  // ─── TẠO SẢN PHẨM ────────────────────────────────────────────────────────

  async create(dto: CreateProductDto): Promise<Product> {
    const slug = await this.generateUniqueSlug(dto.name);

    const product = this.productRepo.create({
      publicId: uuidv4(),
      name: dto.name,
      slug,
      description: dto.description ?? null,
      price: dto.price,
      isActive: dto.isActive ?? true,
      version: 0,
    });

    return this.productRepo.save(product);
  }

  // ─── DANH SÁCH CÓ LỌC VÀ PHÂN TRANG ─────────────────────────────────────

  async findAll(dto: FilterProductDto): Promise<PaginatedResult<Product>> {
    const {
      name,
      categoryId,
      isActive,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 10,
    } = dto;

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categories', 'category')
      .leftJoinAndSelect('product.images', 'image', 'image.variantId IS NULL')
      .where('product.deletedAt IS NULL');

    if (name) {
      qb.andWhere('LOWER(product.name) LIKE LOWER(:name)', {
        name: `%${name}%`,
      });
    }
    if (isActive !== undefined) {
      qb.andWhere('product.isActive = :isActive', { isActive });
    }
    if (categoryId) {
      qb.andWhere('category.id = :categoryId', { categoryId });
    }
    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    const sortField = `product.${sortBy}`;
    qb.orderBy(sortField, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── CHI TIẾT SẢN PHẨM ───────────────────────────────────────────────────

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categories', 'category')
      .leftJoinAndSelect('product.images', 'image')
      .leftJoinAndSelect('product.variants', 'variant')
      .leftJoinAndSelect('variant.options', 'option')
      .leftJoinAndSelect('option.attributeValue', 'attrValue')
      .leftJoinAndSelect('attrValue.attribute', 'attribute')
      .leftJoinAndSelect('variant.images', 'variantImage')
      .where('product.id = :id', { id })
      .andWhere('product.deletedAt IS NULL')
      .getOne();

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm id=${id}`);
    }

    return product;
  }

  // ─── CẬP NHẬT SẢN PHẨM (Optimistic Lock) ────────────────────────────────

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      withDeleted: false,
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm id=${id}`);
    }

    if (product.version !== dto.version) {
      throw new ConflictException(
        `Xung đột phiên bản: sản phẩm đã được cập nhật bởi người khác (version hiện tại: ${product.version})`,
      );
    }

    // Tách 'version' và 'name' ra khỏi đối tượng dto.
    // Các phần còn lại sẽ nằm trong biến 'rest'.
    // Dòng comment bên dưới giúp ESLint không báo lỗi biến 'version' chưa được sử dụng.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { version, name, ...rest } = dto;

    // Sinh slug mới nếu tên thay đổi
    if (name && name !== product.name) {
      product.slug = await this.generateUniqueSlug(name, id);
      product.name = name;
    }

    // Lúc này 'rest' đã không còn chứa 'version' và 'name', rất an toàn để gán
    Object.assign(product, rest);
    product.version = product.version + 1;

    return this.productRepo.save(product);
  }

  // ─── XÓA MỀM ─────────────────────────────────────────────────────────────

  async softDelete(id: number): Promise<{ message: string }> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm id=${id}`);
    }

    await this.productRepo.softRemove(product);
    return { message: 'Đã xóa sản phẩm thành công' };
  }

  // ─── QUẢN LÝ DANH MỤC ────────────────────────────────────────────────────

  async addCategory(productId: number, categoryId: number): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['categories'],
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm id=${productId}`);
    }

    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Không tìm thấy category id=${categoryId}`);
    }

    const alreadyLinked = product.categories.some((c) => c.id === categoryId);
    if (!alreadyLinked) {
      product.categories.push(category);
      await this.productRepo.save(product);
    }

    return product;
  }

  async removeCategory(
    productId: number,
    categoryId: number,
  ): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['categories'],
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm id=${productId}`);
    }

    product.categories = product.categories.filter((c) => c.id !== categoryId);
    return this.productRepo.save(product);
  }

  // ─── QUẢN LÝ ẢNH (cấp product) ───────────────────────────────────────────

  async addImage(
    productId: number,
    dto: AddProductImageDto,
  ): Promise<ProductImage> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm id=${productId}`);
    }

    const image = this.imageRepo.create({
      productId,
      variantId: null,
      imageUrl: dto.imageUrl,
      altText: dto.altText ?? null,
      displayOrder: dto.displayOrder ?? 0,
    });

    return this.imageRepo.save(image);
  }

  async removeImage(imageId: number): Promise<{ message: string }> {
    const image = await this.imageRepo.findOne({ where: { id: imageId } });
    if (!image) {
      throw new NotFoundException(`Không tìm thấy image id=${imageId}`);
    }
    await this.imageRepo.remove(image);
    return { message: 'Đã xóa ảnh thành công' };
  }

  async updateImageOrder(
    imageId: number,
    dto: UpdateImageOrderDto,
  ): Promise<ProductImage> {
    const image = await this.imageRepo.findOne({ where: { id: imageId } });
    if (!image) {
      throw new NotFoundException(`Không tìm thấy image id=${imageId}`);
    }
    image.displayOrder = dto.displayOrder;
    return this.imageRepo.save(image);
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Category } from '@modules/categories/entities/category.entity';
import { ProductVariant } from '@modules/variant/entities/product-variant.entity';
import { ProductVariantOption } from '@modules/variant/entities/product-variant-option.entity';
import { StockLog } from '@modules/stock-logs/entities/stock-log.entity';
import { AttributeValue } from '@modules/attribute/entities/attribute-value.entity';
import { StockLogAction } from '@modules/stock-logs/enums/stock-log-action.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import {
  AddProductImageDto,
  UpdateImageOrderDto,
} from './dto/product-image.dto';
import { CreateProductWithVariantsDto } from './dto/create-product-with-variants.dto';
import type { VariantInFormDto } from './dto/create-product-with-variants.dto';
import { I_STORAGE_PORT } from '@modules/storage/core/ports/storage.port';
import type { IStoragePort } from '@modules/storage/core/ports/storage.port';
import type { File as MulterFile } from 'multer';
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
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductVariantOption)
    private readonly optionRepo: Repository<ProductVariantOption>,
    @InjectRepository(StockLog)
    private readonly stockLogRepo: Repository<StockLog>,
    @InjectRepository(AttributeValue)
    private readonly attrValueRepo: Repository<AttributeValue>,
    @Inject(I_STORAGE_PORT)
    private readonly storagePort: IStoragePort,
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

  // ─── HELPER: Tính option_hash ─────────────────────────────────────────────

  private buildOptionHash(attributeValueIds: number[]): string {
    const sorted = [...attributeValueIds].sort((a, b) => a - b);
    return createHash('md5')
      .update(sorted.join('-'))
      .digest('hex')
      .slice(0, 16);
  }

  // ─── HELPER: Sinh SKU tự động ─────────────────────────────────────────────

  private generateSku(publicId: string, optionHash: string): string {
    const prefix = publicId.replace(/-/g, '').slice(0, 7).toUpperCase();
    return `${prefix}-${optionHash.slice(0, 8).toUpperCase()}`;
  }

  // ─── TẠO SẢN PHẨM (JSON Body đơn giản) ─────────────────────────────────

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

  // ─── TẠO SẢN PHẨM + VARIANTS (multipart/form-data) ──────────────────────

  async createWithVariants(
    dto: CreateProductWithVariantsDto,
    files: Record<string, MulterFile[]>,
    currentUserId?: number,
  ): Promise<Product> {
    // ── 1. Parse categoryIds & variants từ JSON string ────────────────────
    let categoryIds: number[] = [];
    if (dto.categoryIds) {
      try {
        const parsed = JSON.parse(dto.categoryIds);
        if (!Array.isArray(parsed)) throw new Error();
        categoryIds = parsed.map(Number);
      } catch {
        throw new BadRequestException(
          'categoryIds phải là JSON string hợp lệ, ví dụ: "[1, 3]"',
        );
      }
    }

    let variantDtos: VariantInFormDto[] = [];
    if (dto.variants) {
      try {
        const parsed = JSON.parse(dto.variants);
        if (!Array.isArray(parsed)) throw new Error();
        variantDtos = parsed as VariantInFormDto[];
      } catch {
        throw new BadRequestException(
          'variants phải là JSON string hợp lệ của mảng biến thể',
        );
      }
    }

    // ── 2. Validate categories ────────────────────────────────────────────
    let categories: Category[] = [];
    if (categoryIds.length > 0) {
      categories = await this.categoryRepo.find({
        where: { id: In(categoryIds) },
      });
      if (categories.length !== categoryIds.length) {
        const foundIds = categories.map((c) => c.id);
        const missing = categoryIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Không tìm thấy category_id: [${missing.join(', ')}]`,
        );
      }
    }

    // ── 3. Validate attribute values của tất cả variants ─────────────────
    const allAttrValueIds = [
      ...new Set(variantDtos.flatMap((v) => v.attributeValueIds)),
    ];
    let attrValueMap: Map<number, AttributeValue> = new Map();
    if (allAttrValueIds.length > 0) {
      const attrValues = await this.attrValueRepo.find({
        where: { id: In(allAttrValueIds) },
      });
      attrValueMap = new Map(attrValues.map((av) => [av.id, av]));
      const missing = allAttrValueIds.filter((id) => !attrValueMap.has(id));
      if (missing.length > 0) {
        throw new NotFoundException(
          `Không tìm thấy attribute_value_id: [${missing.join(', ')}]`,
        );
      }
    }

    // ── 4. Kiểm tra trùng lặp option_hash trong cùng request ────────────
    const seenHashes = new Set<string>();
    const variantMeta = variantDtos.map((v, index) => {
      const hash = this.buildOptionHash(v.attributeValueIds);
      if (seenHashes.has(hash)) {
        throw new ConflictException(
          `Biến thể tại index ${index} có tổ hợp thuộc tính trùng với biến thể khác trong cùng request`,
        );
      }
      seenHashes.add(hash);
      return { ...v, optionHash: hash, index };
    });

    // ── 5. Upload ảnh chung (generalImages) ──────────────────────────────
    const BUCKET = 'products';
    const generalImageUrls: string[] = [];
    const generalFiles: MulterFile[] = files?.['generalImages'] ?? [];
    for (const file of generalFiles) {
      const url = await this.storagePort.uploadFile(
        {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        BUCKET,
      );
      generalImageUrls.push(url);
      this.logger.log(`Uploaded general image: ${url}`);
    }

    // ── 6. Upload ảnh từng variant (variantImage_0, variantImage_1...) ───
    const variantImageUrls: Map<number, string> = new Map();
    for (const meta of variantMeta) {
      const key = `variantImage_${meta.index}`;
      const variantFile: MulterFile | undefined = (files?.[key] ?? [])[0];
      if (variantFile) {
        const url = await this.storagePort.uploadFile(
          {
            buffer: variantFile.buffer,
            originalname: variantFile.originalname,
            mimetype: variantFile.mimetype,
            size: variantFile.size,
          },
          BUCKET,
        );
        variantImageUrls.set(meta.index, url);
        this.logger.log(`Uploaded variant[${meta.index}] image: ${url}`);
      }
    }

    // ── 7. Tạo Product ────────────────────────────────────────────────────
    const slug = await this.generateUniqueSlug(dto.name);
    const product = this.productRepo.create({
      publicId: uuidv4(),
      name: dto.name,
      slug,
      description: dto.description ?? null,
      price: dto.price,
      isActive: dto.isActive ?? true,
      version: 0,
      categories,
    });
    const savedProduct = await this.productRepo.save(product);

    // ── 8. Lưu ảnh chung vào product_images ─────────────────────────────
    if (generalImageUrls.length > 0) {
      const images = generalImageUrls.map((url, i) =>
        this.imageRepo.create({
          productId: savedProduct.id,
          variantId: null,
          imageUrl: url,
          displayOrder: i,
        }),
      );
      await this.imageRepo.save(images);
    }

    // ── 9. Tạo từng Variant ───────────────────────────────────────────────
    for (const meta of variantMeta) {
      // 9a. Sinh hoặc validate SKU
      let sku = meta.sku;
      if (!sku) {
        sku = this.generateSku(savedProduct.publicId, meta.optionHash);
      }
      const skuConflict = await this.variantRepo.findOne({ where: { sku } });
      if (skuConflict) {
        throw new ConflictException(
          `SKU "${sku}" tại variant index ${meta.index} đã tồn tại`,
        );
      }

      // 9b. Lưu variant
      const variant = this.variantRepo.create({
        productId: savedProduct.id,
        sku,
        price: meta.price,
        stockQuantity: meta.stockQuantity ?? 0,
        isActive: meta.isActive ?? true,
        optionHash: meta.optionHash,
        version: 0,
      });
      const savedVariant = await this.variantRepo.save(variant);

      // 9c. Lưu variant options (attribute values)
      const options = meta.attributeValueIds.map((avId) =>
        this.optionRepo.create({
          variantId: savedVariant.id,
          attributeValueId: avId,
        }),
      );
      await this.optionRepo.save(options);

      // 9d. Ghi stock log nếu stockQuantity > 0
      if ((meta.stockQuantity ?? 0) > 0) {
        const log = this.stockLogRepo.create({
          productId: savedProduct.id,
          variantId: savedVariant.id,
          action: StockLogAction.IN,
          quantityChange: meta.stockQuantity,
          beforeQuantity: 0,
          afterQuantity: meta.stockQuantity,
          reason: meta.reason ?? 'Nhập kho ban đầu khi tạo sản phẩm',
          changedByUserId: currentUserId ?? undefined,
        });
        await this.stockLogRepo.save(log);
      }

      // 9e. Lưu ảnh variant nếu có
      const variantImgUrl = variantImageUrls.get(meta.index);
      if (variantImgUrl) {
        const variantImg = this.imageRepo.create({
          productId: savedProduct.id,
          variantId: savedVariant.id,
          imageUrl: variantImgUrl,
          displayOrder: 0,
        });
        await this.imageRepo.save(variantImg);
      }
    }

    // ── 10. Trả về product đầy đủ relations ─────────────────────────────
    return this.findOne(savedProduct.id);
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

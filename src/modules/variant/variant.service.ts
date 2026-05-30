import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductVariantOption } from './entities/product-variant-option.entity';
import { ProductImage } from '@modules/products/entities/product-image.entity';
import { StockLog } from '@modules/stock-logs/entities/stock-log.entity';
import { AttributeValue } from '@modules/attribute/entities/attribute-value.entity';
import { Product } from '@modules/products/entities/product.entity';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { AddProductImageDto } from '@modules/products/dto/product-image.dto';
import { StockLogAction } from '@modules/stock-logs/enums/stock-log-action.enum';
import type { File as MulterFile } from 'multer';

import { I_STORAGE_PORT } from '@modules/storage/core/ports/storage.port';
import type { IStoragePort } from '@modules/storage/core/ports/storage.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class VariantService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductVariantOption)
    private readonly optionRepo: Repository<ProductVariantOption>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(StockLog)
    private readonly stockLogRepo: Repository<StockLog>,
    @InjectRepository(AttributeValue)
    private readonly attrValueRepo: Repository<AttributeValue>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @Inject(I_STORAGE_PORT)
    private readonly storagePort: IStoragePort,
  ) {}

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

  // ─── HELPER: Ghi stock log ────────────────────────────────────────────────

  private async writeStockLog(
    productId: number,
    variantId: number,
    action: StockLogAction,
    quantityChange: number,
    beforeQuantity: number,
    afterQuantity: number,
    reason?: string,
    changedByUserId?: number,
  ): Promise<void> {
    const log = this.stockLogRepo.create({
      productId,
      variantId,
      action,
      quantityChange: Math.abs(quantityChange),
      beforeQuantity,
      afterQuantity,
      // Thay đổi ?? null thành ?? undefined để giải quyết lỗi TypeScript TypeORM
      reason: reason ?? undefined,
      changedByUserId: changedByUserId ?? undefined,
    });
    await this.stockLogRepo.save(log);
  }

  // ─── LẤY VARIANTS CỦA PRODUCT ────────────────────────────────────────────

  async findByProduct(productId: number): Promise<ProductVariant[]> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm id=${productId}`);
    }

    return this.variantRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.options', 'opt')
      .leftJoinAndSelect('opt.attributeValue', 'attrVal')
      .leftJoinAndSelect('attrVal.attribute', 'attr')
      .leftJoinAndSelect('v.images', 'img')
      .where('v.productId = :productId', { productId })
      .orderBy('v.id', 'ASC')
      .getMany();
  }

  // ─── CHI TIẾT VARIANT ─────────────────────────────────────────────────────

  async findOne(id: number): Promise<ProductVariant> {
    const variant = await this.variantRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.options', 'opt')
      .leftJoinAndSelect('opt.attributeValue', 'attrVal')
      .leftJoinAndSelect('attrVal.attribute', 'attr')
      .leftJoinAndSelect('v.images', 'img')
      .where('v.id = :id', { id })
      .getOne();

    if (!variant) {
      throw new NotFoundException(`Không tìm thấy variant id=${id}`);
    }

    // Load 10 stock logs gần nhất
    variant.stockLogs = await this.stockLogRepo.find({
      where: { variantId: id },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return variant;
  }

  // ─── TẠO VARIANT MỚI ─────────────────────────────────────────────────────

  async create(
    productId: number,
    dto: CreateVariantDto,
    files: MulterFile[],
    currentUserId?: number,
  ): Promise<ProductVariant> {
    // 1. Validate product
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm id=${productId}`);
    }

    // 2. Validate attribute values
    const attrValues = await this.attrValueRepo.find({
      where: { id: In(dto.attributeValueIds) },
    });
    if (attrValues.length !== dto.attributeValueIds.length) {
      const foundIds = attrValues.map((av) => av.id);
      const missing = dto.attributeValueIds.filter(
        (id) => !foundIds.includes(id),
      );
      throw new NotFoundException(
        `Không tìm thấy attribute_value_id: [${missing.join(', ')}]`,
      );
    }

    // 3. Tính option_hash
    const optionHash = this.buildOptionHash(dto.attributeValueIds);

    // 4. Kiểm tra unique (productId, optionHash)
    const duplicate = await this.variantRepo.findOne({
      where: { productId, optionHash },
    });
    if (duplicate) {
      throw new ConflictException(
        `Biến thể với tổ hợp thuộc tính này đã tồn tại (variant id=${duplicate.id})`,
      );
    }

    // 5. Tạo/kiểm tra SKU
    let sku = dto.sku;
    if (!sku) {
      sku = this.generateSku(product.publicId, optionHash);
    }
    const skuConflict = await this.variantRepo.findOne({ where: { sku } });
    if (skuConflict) {
      throw new ConflictException(`SKU "${sku}" đã tồn tại`);
    }

    // 6. Lưu variant
    const variant = this.variantRepo.create({
      productId,
      sku,
      price: dto.price,
      stockQuantity: dto.stockQuantity,
      isActive: dto.isActive ?? true,
      optionHash,
      version: 0,
    });
    const savedVariant = await this.variantRepo.save(variant);

    // 7. Lưu variant options
    const options = dto.attributeValueIds.map((avId) =>
      this.optionRepo.create({
        variantId: savedVariant.id,
        attributeValueId: avId,
      }),
    );
    await this.optionRepo.save(options);

    // 8. Ghi stock log nếu stockQuantity > 0
    if (dto.stockQuantity > 0) {
      await this.writeStockLog(
        productId,
        savedVariant.id,
        StockLogAction.IN,
        dto.stockQuantity,
        0,
        dto.stockQuantity,
        dto.reason ?? 'Nhập kho ban đầu khi tạo variant',
        currentUserId,
      );
    }

    // ──────────────── THÊM MỚI BƯỚC 9: XỬ LÝ ẢNH ────────────────
    // 9. Tải ảnh lên và lưu vào DB
    if (files && files.length > 0) {
      // 9.1: Chuyển đổi Express.Multer.File sang IFileDto mà Storage Service mong muốn
      const fileDtos = files.map((file) => ({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      }));

      // 9.2: Gọi service lưu trữ file với 2 tham số (danh sách IFileDto và tên bucket)
      const uploadedUrls = await Promise.all(
        fileDtos.map((file) => this.storagePort.uploadFile(file, 'products')),
      );

      // 9.3: Tạo dữ liệu entity lưu vào bảng hình ảnh
      const imageEntities = uploadedUrls.map((url, index) => {
        return this.imageRepo.create({
          productId: productId,
          variantId: savedVariant.id,
          imageUrl: url,
          displayOrder: index,
        });
      });

      // 9.4: Lưu tất cả vào DB
      await this.imageRepo.save(imageEntities);
    }
    return this.findOne(savedVariant.id);
  }

  // ─── CẬP NHẬT VARIANT (Optimistic Lock) ──────────────────────────────────

  async update(
    id: number,
    dto: UpdateVariantDto,
    currentUserId?: number,
  ): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({ where: { id } });
    if (!variant) {
      throw new NotFoundException(`Không tìm thấy variant id=${id}`);
    }

    // Phân rã đối tượng dto trước. Dùng biến 'version' để kiểm tra,
    // qua đó biến này được sử dụng (giải quyết lỗi unused vars)
    const { version, reason, stockQuantity, ...rest } = dto;

    if (variant.version !== version) {
      throw new ConflictException(
        `Xung đột phiên bản: variant đã được cập nhật (version hiện tại: ${variant.version})`,
      );
    }

    const oldStock = variant.stockQuantity;

    Object.assign(variant, rest);

    // Nếu thay đổi stockQuantity → ghi stock log
    if (stockQuantity !== undefined && stockQuantity !== oldStock) {
      const diff = stockQuantity - oldStock;
      const action =
        diff > 0
          ? StockLogAction.IN
          : diff < 0
            ? StockLogAction.OUT
            : StockLogAction.ADJUSTMENT;

      variant.stockQuantity = stockQuantity;

      await this.writeStockLog(
        variant.productId,
        variant.id,
        action,
        diff,
        oldStock,
        stockQuantity,
        reason ?? 'Điều chỉnh tồn kho',
        currentUserId,
      );
    }

    variant.version = variant.version + 1;
    const saved = await this.variantRepo.save(variant);
    return this.findOne(saved.id);
  }

  // ─── XÓA VARIANT ─────────────────────────────────────────────────────────

  async remove(id: number): Promise<{ message: string }> {
    const variant = await this.variantRepo.findOne({ where: { id } });
    if (!variant) {
      throw new NotFoundException(`Không tìm thấy variant id=${id}`);
    }
    await this.variantRepo.remove(variant);
    return { message: 'Đã xóa variant thành công' };
  }

  // ─── QUẢN LÝ ẢNH VARIANT ─────────────────────────────────────────────────

  async addImage(
    variantId: number,
    dto: AddProductImageDto,
  ): Promise<ProductImage> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
    });
    if (!variant) {
      throw new NotFoundException(`Không tìm thấy variant id=${variantId}`);
    }

    const image = this.imageRepo.create({
      productId: variant.productId,
      variantId,
      imageUrl: dto.imageUrl,
      altText: dto.altText ?? null, // Lưu ý: Nếu cột này cũng báo lỗi null, hãy đổi thành undefined như ở trên nhé
      displayOrder: dto.displayOrder ?? 1,
    });

    return this.imageRepo.save(image);
  }

  async removeImage(imageId: number): Promise<{ message: string }> {
    const image = await this.imageRepo.findOne({ where: { id: imageId } });
    if (!image) {
      throw new NotFoundException(`Không tìm thấy image id=${imageId}`);
    }
    await this.imageRepo.remove(image);
    return { message: 'Đã xóa ảnh variant thành công' };
  }
}

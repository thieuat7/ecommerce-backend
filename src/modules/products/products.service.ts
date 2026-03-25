import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  // Tạo mới sản phẩm
  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create({
      ...createProductDto,
      locked_stock: createProductDto.locked_stock ?? 0,
    });

    return this.productRepository.save(product);
  }

  // Lấy danh sách toàn bộ sản phẩm
  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      order: { id: 'DESC' },
    });
  }

  // Lấy chi tiết 1 sản phẩm theo id
  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với id=${id}`);
    }

    return product;
  }

  // Cập nhật thông tin sản phẩm theo id
  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);
    const updatedProduct = this.productRepository.merge(
      product,
      updateProductDto,
    );

    return this.productRepository.save(updatedProduct);
  }

  // Xóa sản phẩm theo id
  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }
}

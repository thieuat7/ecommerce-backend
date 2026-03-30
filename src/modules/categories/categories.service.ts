import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  // ─── Tạo danh mục ────────────────────────────────────────────────────
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { name, description } = createCategoryDto;

    // Kiểm tra tên danh mục đã tồn tại chưa
    const existing = await this.categoriesRepository.findOne({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(`Danh mục với tên "${name}" đã tồn tại.`);
    }

    const category = this.categoriesRepository.create({ name, description });
    const saved = await this.categoriesRepository.save(category);
    this.logger.log(`Đã tạo danh mục id=${saved.id} name="${saved.name}"`);
    return saved;
  }

  // ─── Lấy tất cả danh mục ───────────────────────────────────────────────
  async findAll(): Promise<Category[]> {
    return await this.categoriesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Lấy một danh mục theo id ──────────────────────────────────────────
  async findOne(id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với id=${id}.`);
    }
    return category;
  }

  // ─── Cập nhật danh mục ─────────────────────────────────────────────────
  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);

    // Kiểm tra tên mới có trùng với danh mục khác không
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existing = await this.categoriesRepository.findOne({
        where: { name: updateCategoryDto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Danh mục với tên "${updateCategoryDto.name}" đã tồn tại.`,
        );
      }
    }

    Object.assign(category, updateCategoryDto);
    const updated = await this.categoriesRepository.save(category);
    this.logger.log(`Đã cập nhật danh mục id=${updated.id}`);
    return updated;
  }

  // ─── Xóa danh mục ─────────────────────────────────────────────────────
  async remove(id: number): Promise<{ message: string }> {
    const category = await this.findOne(id);

    // Kiểm tra còn sản phẩm trong danh mục không
    if (category.products && category.products.length > 0) {
      throw new ConflictException(
        `Không thể xóa danh mục id=${id} vì còn ${category.products.length} sản phẩm liên quan.`,
      );
    }

    await this.categoriesRepository.remove(category);
    this.logger.log(`Đã xóa danh mục id=${id}`);
    return { message: `Đã xóa danh mục id=${id} thành công.` };
  }
}

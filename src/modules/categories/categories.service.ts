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

  // ─── HÀM HELPER: Dựng cây thư mục ─────────────────────────────────────
  // Hàm đệ quy này sẽ tự động lồng các danh mục con vào đúng danh mục cha
  private buildTree(
    categories: Category[],
    parentId: number | null,
  ): Category[] {
    return categories
      .filter((category) => category.parentId === parentId)
      .map(
        (category) =>
          ({
            ...category,
            children: this.buildTree(categories, category.id),
          }) as Category,
      ); // Thêm 'as Category' để ép kiểu an toàn
  }

  // Hàm này giúp lấy tất cả ID của danh mục hiện tại và các con của nó
  private getAllCategoryIds(category: Category): number[] {
    let ids = [category.id];
    if (category.children && category.children.length > 0) {
      category.children.forEach((child) => {
        ids = [...ids, ...this.getAllCategoryIds(child)];
      });
    }
    return ids;
  }

  // ─── Lấy tất cả danh mục (Dạng Cây JSON) ──────────────────────────────
  async findAll(): Promise<Category[]> {
    const categories = await this.categoriesRepository.find({
      order: { createdAt: 'DESC' },
    });

    return this.buildTree(categories, null);
  }

  // ─── Lấy một danh mục theo id ──────────────────────────────────────────
  // Hàm này hiện tại chỉ đang lấy thông tin của một danh mục, không lấy các danh mục con.
  // Hàm sẽ được nâng cấp sau khi hoàn thành products module.
  async findOne(id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'products'],
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với id=${id}.`);
    }
    return category;
  }

  // ─── Tạo danh mục ────────────────────────────────────────────────────
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { name, description, parentId } = createCategoryDto;

    // 1. Kiểm tra tên danh mục đã tồn tại chưa
    const existing = await this.categoriesRepository.findOne({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(`Danh mục với tên "${name}" đã tồn tại.`);
    }

    let parentCategory: Category | null = null;

    // 2. Nếu có truyền lên parentId, kiểm tra xem danh mục cha có tồn tại không
    if (parentId) {
      parentCategory = await this.categoriesRepository.findOne({
        where: { id: parentId },
      });
      if (!parentCategory) {
        throw new NotFoundException(
          `Không tìm thấy danh mục cha với id=${parentId}.`,
        );
      }
    }

    // 3. Tạo instance cho danh mục
    const category = this.categoriesRepository.create({
      name,
      description,
    });

    // Nếu có danh mục cha thì gán vào, nếu không thì giữ nguyên (null)
    if (parentCategory) {
      category.parent = parentCategory;
    }

    // Lưu vào database
    const saved = await this.categoriesRepository.save(category);
    this.logger.log(`Đã tạo danh mục id=${saved.id} name="${saved.name}"`);
    return saved;
  }

  // ─── Cập nhật danh mục ─────────────────────────────────────────────────
  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);

    // 1. Kiểm tra trùng lặp tên
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

    // 2. Xử lý cập nhật danh mục cha (parentId)
    if (updateCategoryDto.parentId !== undefined) {
      if (updateCategoryDto.parentId === id) {
        throw new ConflictException(
          'Một danh mục không thể làm cha của chính nó.',
        );
      }

      if (updateCategoryDto.parentId === null) {
        category.parent = null;
      } else {
        const parentCategory = await this.categoriesRepository.findOne({
          where: { id: updateCategoryDto.parentId },
        });
        if (!parentCategory) {
          throw new NotFoundException(
            `Không tìm thấy danh mục cha với id=${updateCategoryDto.parentId}.`,
          );
        }
        category.parent = parentCategory;
      }
    }

    // 3. Cập nhật các trường còn lại
    if (updateCategoryDto.name) category.name = updateCategoryDto.name;
    if (updateCategoryDto.description !== undefined)
      category.description = updateCategoryDto.description;

    const updated = await this.categoriesRepository.save(category);
    this.logger.log(`Đã cập nhật danh mục id=${updated.id}`);
    return updated;
  }

  // ─── Xóa danh mục ─────────────────────────────────────────────────────
  async remove(id: number): Promise<{ message: string }> {
    const category = await this.findOne(id);

    if (category.products && category.products.length > 0) {
      throw new ConflictException(
        `Không thể xóa danh mục id=${id} vì còn ${category.products.length} sản phẩm liên quan.`,
      );
    }

    if (category.children && category.children.length > 0) {
      throw new ConflictException(
        `Không thể xóa danh mục id=${id} vì đang có ${category.children.length} danh mục con phụ thuộc.`,
      );
    }

    await this.categoriesRepository.softRemove(category);

    this.logger.log(`Đã xóa mềm danh mục id=${id}`);
    return { message: `Đã xóa danh mục id=${id} thành công.` };
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attribute } from './entities/attribute.entity';
import { AttributeValue } from './entities/attribute-value.entity';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';
import { UpdateAttributeValueDto } from './dto/update-attribute-value.dto';

@Injectable()
export class AttributeService {
  constructor(
    @InjectRepository(Attribute)
    private readonly attributeRepo: Repository<Attribute>,
    @InjectRepository(AttributeValue)
    private readonly attributeValueRepo: Repository<AttributeValue>,
  ) {}

  // ─── ATTRIBUTE CRUD ──────────────────────────────────────────────────────────

  async create(dto: CreateAttributeDto): Promise<Attribute> {
    const existing = await this.attributeRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Attribute với name="${dto.name}" đã tồn tại`,
      );
    }
    const attr = this.attributeRepo.create({
      name: dto.name,
      displayName: dto.displayName,
    });
    return this.attributeRepo.save(attr);
  }

  async findAll(includeValues = false): Promise<Attribute[]> {
    return this.attributeRepo.find({
      order: { name: 'ASC' },
      relations: includeValues ? ['values'] : [],
    });
  }

  async findOne(id: number): Promise<Attribute> {
    const attr = await this.attributeRepo.findOne({
      where: { id },
      relations: ['values'],
    });
    if (!attr) {
      throw new NotFoundException(`Không tìm thấy attribute id=${id}`);
    }
    return attr;
  }

  async update(id: number, dto: UpdateAttributeDto): Promise<Attribute> {
    const attr = await this.findOne(id);

    // Kiểm tra unique name nếu đổi tên
    if (dto.name && dto.name !== attr.name) {
      const conflict = await this.attributeRepo.findOne({
        where: { name: dto.name },
      });
      if (conflict) {
        throw new ConflictException(
          `Attribute với name="${dto.name}" đã tồn tại`,
        );
      }
    }

    Object.assign(attr, dto);
    return this.attributeRepo.save(attr);
  }

  async remove(id: number): Promise<{ message: string }> {
    const attr = await this.findOne(id);

    // Kiểm tra xem có values nào đang dùng trong product_variant_options không
    const inUseCount = await this.attributeValueRepo
      .createQueryBuilder('av')
      .innerJoin('av.productVariantOptions', 'pvo')
      .where('av.attribute_id = :id', { id })
      .getCount();

    if (inUseCount > 0) {
      throw new BadRequestException(
        `Không thể xóa: attribute có ${inUseCount} giá trị đang được dùng trong product variants`,
      );
    }

    await this.attributeRepo.remove(attr);
    return { message: 'Đã xóa attribute thành công' };
  }

  // ─── ATTRIBUTE VALUES CRUD ────────────────────────────────────────────────

  async createValue(dto: CreateAttributeValueDto): Promise<AttributeValue> {
    // Validate attribute tồn tại
    const attr = await this.attributeRepo.findOne({
      where: { id: dto.attributeId },
    });
    if (!attr) {
      throw new NotFoundException(
        `Không tìm thấy attribute id=${dto.attributeId}`,
      );
    }

    // Kiểm tra unique (attributeId, value)
    const existing = await this.attributeValueRepo.findOne({
      where: { attributeId: dto.attributeId, value: dto.value },
    });
    if (existing) {
      throw new ConflictException(
        `Giá trị "${dto.value}" đã tồn tại trong attribute này`,
      );
    }

    const attrValue = this.attributeValueRepo.create({
      attributeId: dto.attributeId,
      value: dto.value,
      displayValue: dto.displayValue,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.attributeValueRepo.save(attrValue);
  }

  async findValuesByAttribute(attributeId: number): Promise<AttributeValue[]> {
    // Validate attribute tồn tại
    await this.findOne(attributeId);

    return this.attributeValueRepo.find({
      where: { attributeId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async findOneValue(id: number): Promise<AttributeValue> {
    const val = await this.attributeValueRepo.findOne({
      where: { id },
      relations: ['attribute'],
    });
    if (!val) {
      throw new NotFoundException(`Không tìm thấy attribute value id=${id}`);
    }
    return val;
  }

  async updateValue(
    id: number,
    dto: UpdateAttributeValueDto,
  ): Promise<AttributeValue> {
    const val = await this.findOneValue(id);
    Object.assign(val, dto);
    return this.attributeValueRepo.save(val);
  }

  async removeValue(id: number): Promise<{ message: string }> {
    const val = await this.findOneValue(id);

    // Kiểm tra xem giá trị này đang được dùng trong product_variant_options
    const inUse = await this.attributeValueRepo
      .createQueryBuilder('av')
      .innerJoin('av.productVariantOptions', 'pvo')
      .where('av.id = :id', { id })
      .getCount();

    if (inUse > 0) {
      throw new BadRequestException(
        `Không thể xóa: giá trị đang được dùng bởi ${inUse} product variant`,
      );
    }

    await this.attributeValueRepo.remove(val);
    return { message: 'Đã xóa attribute value thành công' };
  }
}

import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  private normalizeRoleName(value: unknown): string {
    return String(value).trim().toLowerCase();
  }

  private normalizeDescription(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const normalizedName = this.normalizeRoleName(createRoleDto.name);

    const existingRole = await this.roleRepository.findOne({
      where: { name: normalizedName },
    });

    if (existingRole) {
      throw new ConflictException(
        `Role với tên "${normalizedName}" đã tồn tại.`,
      );
    }

    const role = this.roleRepository.create({
      name: normalizedName,
      description: this.normalizeDescription(createRoleDto.description),
    });

    const savedRole = await this.roleRepository.save(role);
    this.logger.log(`Đã tạo role id=${savedRole.id} name="${savedRole.name}"`);
    return savedRole;
  }

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy role với id=${id}.`);
    }

    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    if (updateRoleDto.name) {
      const normalizedName = this.normalizeRoleName(updateRoleDto.name);

      if (normalizedName !== role.name) {
        const existingRole = await this.roleRepository.findOne({
          where: { name: normalizedName },
        });

        if (existingRole) {
          throw new ConflictException(
            `Role với tên "${normalizedName}" đã tồn tại.`,
          );
        }
      }

      role.name = normalizedName;
    }

    if (updateRoleDto.description !== undefined) {
      role.description = this.normalizeDescription(updateRoleDto.description);
    }

    const updatedRole = await this.roleRepository.save(role);
    this.logger.log(`Đã cập nhật role id=${updatedRole.id}`);
    return updatedRole;
  }

  async remove(id: number): Promise<{ message: string }> {
    const role = await this.findOne(id);

    await this.roleRepository.remove(role);
    this.logger.log(`Đã xóa role id=${id}`);

    return { message: `Đã xóa role id=${id} thành công.` };
  }
}

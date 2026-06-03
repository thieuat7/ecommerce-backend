import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserAddress } from './entities/user-address.entity';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';

@Injectable()
export class UserAddressesService {
  private readonly logger = new Logger(UserAddressesService.name);

  constructor(
    @InjectRepository(UserAddress)
    private readonly addressRepository: Repository<UserAddress>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Tạo địa chỉ mới ─────────────────────────────────────────────────────────

  async create(
    userId: number,
    dto: CreateUserAddressDto,
  ): Promise<UserAddress> {
    return this.dataSource.transaction(async (manager) => {
      // Nếu đây là địa chỉ đầu tiên → tự động set làm mặc định
      const existingCount = await manager.count(UserAddress, {
        where: { userId, deletedAt: null as any },
      });

      const isDefault =
        dto.isDefault !== undefined ? dto.isDefault : existingCount === 0;

      // Nếu set làm mặc định → reset tất cả địa chỉ khác của user
      if (isDefault) {
        await manager.update(
          UserAddress,
          { userId, isDefault: true },
          { isDefault: false },
        );
      }

      const address = manager.create(UserAddress, {
        ...dto,
        userId,
        isDefault,
        country: dto.country ?? 'Vietnam',
      });

      const saved = await manager.save(UserAddress, address);
      this.logger.log(
        `Tạo địa chỉ id=${saved.id} cho user_id=${userId} (isDefault=${isDefault})`,
      );

      return saved;
    });
  }

  // ─── Lấy tất cả địa chỉ của user ─────────────────────────────────────────────

  async findAllByUser(userId: number): Promise<UserAddress[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  // ─── Lấy chi tiết một địa chỉ (chỉ owner) ────────────────────────────────────

  async findOne(id: number, userId: number): Promise<UserAddress> {
    const address = await this.addressRepository.findOne({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundException(
        `Không tìm thấy địa chỉ id=${id} hoặc bạn không có quyền truy cập.`,
      );
    }

    return address;
  }

  // ─── Cập nhật địa chỉ ────────────────────────────────────────────────────────

  async update(
    id: number,
    userId: number,
    dto: UpdateUserAddressDto,
  ): Promise<UserAddress> {
    return this.dataSource.transaction(async (manager) => {
      const address = await manager.findOne(UserAddress, {
        where: { id, userId },
      });

      if (!address) {
        throw new NotFoundException(
          `Không tìm thấy địa chỉ id=${id} hoặc bạn không có quyền.`,
        );
      }

      // Nếu đổi sang isDefault = true → reset các địa chỉ khác
      if (dto.isDefault === true && !address.isDefault) {
        await manager.update(
          UserAddress,
          { userId, isDefault: true },
          { isDefault: false },
        );
      }

      // Không cho phép bỏ isDefault của địa chỉ mặc định hiện tại
      // (phải set địa chỉ khác làm mặc định trước)
      if (dto.isDefault === false && address.isDefault) {
        const otherCount = await manager.count(UserAddress, {
          where: { userId, isDefault: true },
        });
        if (otherCount <= 1) {
          throw new BadRequestException(
            'Không thể bỏ mặc định địa chỉ này. Hãy set địa chỉ khác làm mặc định trước.',
          );
        }
      }

      Object.assign(address, dto);
      const updated = await manager.save(UserAddress, address);
      this.logger.log(`Cập nhật địa chỉ id=${id} cho user_id=${userId}`);

      return updated;
    });
  }

  // ─── Đặt làm địa chỉ mặc định ────────────────────────────────────────────────

  async setDefault(id: number, userId: number): Promise<UserAddress> {
    return this.dataSource.transaction(async (manager) => {
      const address = await manager.findOne(UserAddress, {
        where: { id, userId },
      });

      if (!address) {
        throw new NotFoundException(
          `Không tìm thấy địa chỉ id=${id} hoặc bạn không có quyền.`,
        );
      }

      if (address.isDefault) {
        return address; // Đã là mặc định, không cần làm gì
      }

      // Reset tất cả → set cái này làm mặc định
      await manager.update(
        UserAddress,
        { userId, isDefault: true },
        { isDefault: false },
      );

      address.isDefault = true;
      const updated = await manager.save(UserAddress, address);
      this.logger.log(`Đặt địa chỉ id=${id} làm mặc định cho user_id=${userId}`);

      return updated;
    });
  }

  // ─── Xóa mềm địa chỉ ─────────────────────────────────────────────────────────

  async remove(id: number, userId: number): Promise<{ message: string }> {
    return this.dataSource.transaction(async (manager) => {
      const address = await manager.findOne(UserAddress, {
        where: { id, userId },
      });

      if (!address) {
        throw new NotFoundException(
          `Không tìm thấy địa chỉ id=${id} hoặc bạn không có quyền.`,
        );
      }

      if (address.isDefault) {
        // Kiểm tra còn địa chỉ khác không — nếu có thì tự động chọn địa chỉ mới nhất làm mặc định
        const others = await manager.find(UserAddress, {
          where: { userId },
          order: { createdAt: 'DESC' },
        });

        const remaining = others.filter((a) => a.id !== id);
        if (remaining.length > 0) {
          remaining[0].isDefault = true;
          await manager.save(UserAddress, remaining[0]);
          this.logger.log(
            `Tự động đặt địa chỉ id=${remaining[0].id} làm mặc định mới cho user_id=${userId}`,
          );
        }
      }

      await manager.softRemove(UserAddress, address);
      this.logger.log(`Soft-delete địa chỉ id=${id} của user_id=${userId}`);

      return { message: `Đã xóa địa chỉ thành công.` };
    });
  }

  // ─── [Admin] Lấy tất cả địa chỉ của bất kỳ user ─────────────────────────────

  async findAllByUserForAdmin(userId: number): Promise<UserAddress[]> {
    return this.addressRepository.find({
      where: { userId },
      withDeleted: true,
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }
}

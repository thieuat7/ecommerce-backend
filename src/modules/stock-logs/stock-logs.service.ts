import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockLog } from './entities/stock-log.entity';
import { FilterStockLogDto } from './dto/filter-stock-log.dto';

// Import thêm các DTO để sử dụng cho việc thêm và cập nhật
import { CreateStockLogDto } from './dto/create-stock-log.dto';
import { UpdateStockLogDto } from './dto/update-stock-log.dto';

@Injectable()
export class StockLogsService {
  constructor(
    @InjectRepository(StockLog)
    private readonly stockLogRepo: Repository<StockLog>,
  ) {}

  // ==========================================
  // THÊM MỚI (CREATE)
  // ==========================================
  async create(createLogDto: CreateStockLogDto): Promise<StockLog> {
    // stockLogRepo.create() chỉ tạo ra đối tượng trong bộ nhớ
    const newLog = this.stockLogRepo.create(createLogDto);

    // .save() mới thực sự lưu đối tượng đó vào cơ sở dữ liệu
    return await this.stockLogRepo.save(newLog);
  }

  // ==========================================
  // LẤY DANH SÁCH (READ)
  // ==========================================
  async findAll(filter: FilterStockLogDto) {
    const {
      productId,
      variantId,
      action,
      changedByUserId,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filter;

    const qb = this.stockLogRepo.createQueryBuilder('log');

    if (productId) qb.andWhere('log.productId = :productId', { productId });
    if (variantId) qb.andWhere('log.variantId = :variantId', { variantId });
    if (action) qb.andWhere('log.action = :action', { action });
    if (changedByUserId)
      qb.andWhere('log.changedByUserId = :changedByUserId', {
        changedByUserId,
      });
    if (fromDate)
      qb.andWhere('log.createdAt >= :fromDate', {
        fromDate: new Date(fromDate),
      });
    if (toDate)
      qb.andWhere('log.createdAt <= :toDate', { toDate: new Date(toDate) });

    qb.orderBy(`log.${sortBy}`, sortOrder)
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

  // ==========================================
  // LẤY CHI TIẾT 1 BẢN GHI (READ ONE)
  // ==========================================
  async findOne(id: number): Promise<StockLog> {
    const log = await this.stockLogRepo.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Không tìm thấy stock log id=${id}`);
    }
    return log;
  }

  // ==========================================
  // CẬP NHẬT (UPDATE)
  // ==========================================
  async update(id: number, updateLogDto: UpdateStockLogDto): Promise<StockLog> {
    // 1. Tìm log hiện tại (sử dụng lại hàm findOne để tận dụng việc kiểm tra tồn tại)
    const existingLog = await this.findOne(id);

    // 2. Ghi đè các trường mới vào log hiện tại
    this.stockLogRepo.merge(existingLog, updateLogDto);

    // 3. Lưu lại vào cơ sở dữ liệu
    return await this.stockLogRepo.save(existingLog);
  }

  // ==========================================
  // XÓA (DELETE)
  // ==========================================
  async remove(id: number): Promise<void> {
    // 1. Tìm log cần xóa
    const logToRemove = await this.findOne(id);

    // 2. Thực hiện xóa khỏi cơ sở dữ liệu
    await this.stockLogRepo.remove(logToRemove);
  }

  // ==========================================
  // CÁC PHƯƠNG THỨC TIỆN ÍCH KHÁC
  // ==========================================

  /**
   * Convenience: find logs for a specific product using the same filter shape
   */
  async findByProduct(productId: number, filter: FilterStockLogDto) {
    return this.findAll({ ...filter, productId });
  }

  /**
   * Convenience: find logs for a specific variant using the same filter shape
   */
  async findByVariant(variantId: number, filter: FilterStockLogDto) {
    return this.findAll({ ...filter, variantId });
  }
}

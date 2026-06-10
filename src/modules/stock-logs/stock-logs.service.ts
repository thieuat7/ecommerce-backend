import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StockLog } from './entities/stock-log.entity';
import { FilterStockLogDto } from './dto/filter-stock-log.dto';
import { CreateStockLogDto } from './dto/create-stock-log.dto';

@Injectable()
export class StockLogsService {
  constructor(
    @InjectRepository(StockLog)
    private readonly stockLogRepo: Repository<StockLog>,
  ) {}

  // ==========================================
  // CREATE - ghi log (KHÔNG update)
  // ==========================================
  async create(createLogDto: CreateStockLogDto): Promise<StockLog> {
    const log = this.stockLogRepo.create({
      ...createLogDto,
      createdAt: new Date(),
    });

    return this.stockLogRepo.save(log);
  }

  // ==========================================
  // FIND ALL (có filter + pagination)
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
    if (changedByUserId) {
      qb.andWhere('log.changedByUserId = :changedByUserId', {
        changedByUserId,
      });
    }

    if (fromDate) {
      qb.andWhere('log.createdAt >= :fromDate', {
        fromDate: new Date(fromDate),
      });
    }

    if (toDate) {
      qb.andWhere('log.createdAt <= :toDate', {
        toDate: new Date(toDate),
      });
    }

    const allowedSort = ['createdAt', 'quantity', 'productId', 'action'];
    const safeSortBy = allowedSort.includes(sortBy) ? sortBy : 'createdAt';

    const safeSortOrder: 'ASC' | 'DESC' = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(`log.${safeSortBy}`, safeSortOrder)
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
  // FIND ONE
  // ==========================================
  async findOne(id: number): Promise<StockLog> {
    const log = await this.stockLogRepo.findOne({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException(`Không tìm thấy stock log id=${id}`);
    }

    return log;
  }

  // ==========================================
  // Convenience: theo product
  // ==========================================
  async findByProduct(productId: number, filter: FilterStockLogDto) {
    return this.findAll({ ...filter, productId });
  }

  // ==========================================
  // Convenience: theo variant
  // ==========================================
  async findByVariant(variantId: number, filter: FilterStockLogDto) {
    return this.findAll({ ...filter, variantId });
  }
}

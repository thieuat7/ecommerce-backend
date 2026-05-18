import { Injectable } from '@nestjs/common';
import { CreateStockLogDto } from './dto/create-stock-log.dto';
import { UpdateStockLogDto } from './dto/update-stock-log.dto';

@Injectable()
export class StockLogsService {
  create(createStockLogDto: CreateStockLogDto) {
    return 'This action adds a new stockLog';
  }

  findAll() {
    return `This action returns all stockLogs`;
  }

  findOne(id: number) {
    return `This action returns a #${id} stockLog`;
  }

  update(id: number, updateStockLogDto: UpdateStockLogDto) {
    return `This action updates a #${id} stockLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} stockLog`;
  }
}

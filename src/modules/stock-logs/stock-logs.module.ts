import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockLogsService } from './stock-logs.service';
import { StockLogController } from './stock-logs.controller';
import { StockLog } from './entities/stock-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockLog])],
  controllers: [StockLogController],
  providers: [StockLogsService],
  exports: [TypeOrmModule],
})
export class StockLogsModule {}

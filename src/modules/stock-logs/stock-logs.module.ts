import { Module } from '@nestjs/common';
import { StockLogsService } from './stock-logs.service';
import { StockLogsController } from './stock-logs.controller';

@Module({
  controllers: [StockLogsController],
  providers: [StockLogsService],
})
export class StockLogsModule {}

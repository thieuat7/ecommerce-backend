import { Test, TestingModule } from '@nestjs/testing';
import { StockLogsController } from './stock-logs.controller';
import { StockLogsService } from './stock-logs.service';

describe('StockLogsController', () => {
  let controller: StockLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockLogsController],
      providers: [StockLogsService],
    }).compile();

    controller = module.get<StockLogsController>(StockLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

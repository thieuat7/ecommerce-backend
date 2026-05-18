import { Test, TestingModule } from '@nestjs/testing';
import { StockLogsService } from './stock-logs.service';

describe('StockLogsService', () => {
  let service: StockLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StockLogsService],
    }).compile();

    service = module.get<StockLogsService>(StockLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

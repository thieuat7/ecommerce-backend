import { PartialType } from '@nestjs/mapped-types';
import { CreateStockLogDto } from './create-stock-log.dto';

export class UpdateStockLogDto extends PartialType(CreateStockLogDto) {}

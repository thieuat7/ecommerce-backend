import {
  IsOptional,
  IsInt,
  IsEnum,
  IsString,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StockLogAction } from '../enums/stock-log-action.enum';

export class FilterStockLogDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  productId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  variantId?: number;

  @IsOptional()
  @IsEnum(StockLogAction)
  action?: StockLogAction;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  changedByUserId?: number;

  @IsOptional()
  @IsDateString()
  fromDate?: string; // ISO 8601

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsPositive,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsInt({ message: 'ID sản phẩm phải là số nguyên' })
  @IsPositive({ message: 'ID sản phẩm không hợp lệ' })
  productId: number;

  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @IsPositive({ message: 'Số lượng phải lớn hơn 0' })
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsInt,
  IsPositive,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../enums/order-status.enum';
/**
 * DTO cho từng món hàng trong đơn hàng
 */
export class CreateOrderItemDto {
  @IsInt()
  @IsPositive({ message: 'ID sản phẩm phải là số dương' })
  productId: number;

  @IsInt()
  @IsPositive({ message: 'Số lượng phải lớn hơn 0' })
  quantity: number;
}

/**
 * DTO chính để tạo Đơn hàng
 */
export class CreateOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ giao hàng không được để trống' })
  shippingAddress: string;

  @IsArray()
  @ValidateNested({ each: true }) // Kiểm tra từng phần tử trong mảng items
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ' })
  status?: OrderStatus; // Sử dụng Enum ở đây

  @IsOptional()
  @IsString()
  orderCode?: string;
}

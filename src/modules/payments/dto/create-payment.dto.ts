import { IsNotEmpty, IsNumberString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: 'ID của đơn hàng cần thanh toán' })
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @IsNotEmpty({ message: 'Thiếu thông tin amount' })
  @IsNumberString({}, { message: 'amount phải là số dạng string' })
  amount: string;
}

import { IsNotEmpty, IsNumberString } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty({ message: 'Thiếu thông tin amount' })
  @IsNumberString({}, { message: 'amount phải là số dạng string' })
  amount: string;
}

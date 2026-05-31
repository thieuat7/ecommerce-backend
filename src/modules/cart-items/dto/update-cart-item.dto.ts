import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'Số lượng mới của sản phẩm trong giỏ hàng (tối thiểu 1)',
    example: 3,
    minimum: 1,
  })
  @IsInt({ message: 'quantity phải là số nguyên' })
  @Min(1, { message: 'quantity phải tối thiểu là 1' })
  @IsNotEmpty()
  quantity: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreateCartItemDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  variantId?: number;

  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number = 1;
}

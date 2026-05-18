import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiProperty({
    example: 0,
    description: 'Version hiện tại của sản phẩm (dùng cho optimistic locking)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version: number;
}

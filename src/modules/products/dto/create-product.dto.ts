import { IsString, IsNumber, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Mô tả sản phẩm...', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  stockQuantity: number;

  @ApiProperty({ example: 'https://image.com/product.jpg', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  categoryId: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

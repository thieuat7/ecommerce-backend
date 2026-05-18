import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, MaxLength, IsUrl } from 'class-validator';

export class AddProductImageDto {
  @ApiProperty({ example: 'https://cdn.example.com/product.jpg', description: 'URL hình ảnh' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  imageUrl: string;

  @ApiPropertyOptional({ example: 'iPhone 15 Pro Max', description: 'Alt text' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({ example: 0, description: 'Thứ tự hiển thị' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateImageOrderDto {
  @ApiProperty({ example: 2, description: 'Thứ tự hiển thị mới' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateAttributeValueDto {
  @ApiProperty({ example: 1, description: 'ID của attribute cha' })
  @Type(() => Number)
  @IsInt()
  attributeId: number;

  @ApiProperty({ example: 'red', description: 'Giá trị nội bộ (lowercase, no space)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value: string;

  @ApiProperty({ example: 'Đỏ', description: 'Giá trị hiển thị' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayValue: string;

  @ApiPropertyOptional({ example: 0, description: 'Thứ tự sắp xếp' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString({ message: 'Tên danh mục phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống.' })
  @MaxLength(100, { message: 'Tên danh mục không được vượt quá 100 ký tự.' })
  name: string;

  @IsString({ message: 'Mô tả phải là chuỗi ký tự.' })
  @IsOptional()
  description?: string;
}

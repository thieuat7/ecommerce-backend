import {
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsDefined({ message: 'Tên role là bắt buộc.' })
  @IsNotEmpty({ message: 'Tên role không được để trống.' })
  @IsString({ message: 'Tên role phải là chuỗi ký tự.' })
  @MaxLength(50, { message: 'Tên role không được vượt quá 50 ký tự.' })
  name: string;

  @IsString({ message: 'Mô tả phải là chuỗi ký tự.' })
  @IsOptional()
  description?: string;
}

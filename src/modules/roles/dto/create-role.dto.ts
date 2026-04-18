import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
	@IsString({ message: 'Tên role phải là chuỗi ký tự.' })
	@IsNotEmpty({ message: 'Tên role không được để trống.' })
	@MaxLength(50, { message: 'Tên role không được vượt quá 50 ký tự.' })
	name: string;

	@IsString({ message: 'Mô tả phải là chuỗi ký tự.' })
	@IsOptional()
	description?: string;
}

import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AuthProvider } from '@modules/users/entities/user.entity';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  full_name: string;

  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password?: string;

  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  phone_number?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(AuthProvider, { message: 'Nguồn đăng nhập không hợp lệ' })
  auth_provider?: AuthProvider;

  @IsOptional()
  @IsString()
  provider_id?: string;
}

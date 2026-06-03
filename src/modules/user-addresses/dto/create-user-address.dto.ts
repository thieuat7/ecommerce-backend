import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsPhoneNumber,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateUserAddressDto {
  @ApiProperty({
    description: 'Nhãn phân loại địa chỉ',
    example: 'Nhà riêng',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'label không được để trống' })
  @MaxLength(50, { message: 'label tối đa 50 ký tự' })
  label: string;

  @ApiProperty({
    description: 'Họ và tên người nhận hàng',
    example: 'Nguyễn Văn A',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'recipientName không được để trống' })
  @MaxLength(100, { message: 'recipientName tối đa 100 ký tự' })
  recipientName: string;

  @ApiProperty({
    description: 'Số điện thoại liên lạc khi giao hàng',
    example: '0901234567',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: 'phoneNumber không được để trống' })
  @Matches(/^(\+?\d[\d\s\-().]{7,18}\d)$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Số nhà, tên đường, tòa nhà, tầng...',
    example: '123 Nguyễn Huệ, P. Bến Nghé',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'addressLine không được để trống' })
  @MaxLength(255, { message: 'addressLine tối đa 255 ký tự' })
  addressLine: string;

  @ApiPropertyOptional({
    description: 'Phường / Xã',
    example: 'Phường Bến Nghé',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ward?: string;

  @ApiPropertyOptional({
    description: 'Quận / Huyện',
    example: 'Quận 1',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({
    description: 'Tỉnh / Thành phố',
    example: 'TP. Hồ Chí Minh',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({
    description: 'Quốc gia',
    example: 'Vietnam',
    default: 'Vietnam',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Mã bưu chính',
    example: '700000',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({
    description:
      'Đặt làm địa chỉ mặc định? (true = các địa chỉ khác sẽ bị bỏ mặc định)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isDefault phải là boolean' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Ghi chú thêm cho shipper',
    example: 'Gọi điện trước 30 phút khi giao',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

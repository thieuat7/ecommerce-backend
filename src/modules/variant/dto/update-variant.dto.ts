import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CreateVariantDto } from './create-variant.dto';

export class UpdateVariantDto extends PartialType(
  OmitType(CreateVariantDto, ['attributeValueIds'] as const),
) {
  @ApiProperty({
    example: 0,
    description: 'Version hiện tại của variant (optimistic locking)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version: number;

  /** Ghi đè lý do khi thay đổi stock (stock_log) */
  @ApiPropertyOptional({ example: 'Điều chỉnh tồn kho' })
  @IsOptional()
  @IsString()
  reason?: string;
}

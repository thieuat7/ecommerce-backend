import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

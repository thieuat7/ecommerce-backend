import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAttributeValueDto } from './create-attribute-value.dto';

/** attributeId không được thay đổi sau khi tạo */
export class UpdateAttributeValueDto extends PartialType(
  OmitType(CreateAttributeValueDto, ['attributeId'] as const),
) {}

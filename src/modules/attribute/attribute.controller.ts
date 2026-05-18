import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AttributeService } from './attribute.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';
import { UpdateAttributeValueDto } from './dto/update-attribute-value.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { Transform } from 'class-transformer';

@ApiTags('Attributes')
@Controller()
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  // ══════════════════════════════════════════════
  //  ATTRIBUTES
  // ══════════════════════════════════════════════

  @Get('attributes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách attributes' })
  @ApiQuery({
    name: 'includeValues',
    required: false,
    type: Boolean,
    description: 'Kèm theo attribute values hay không',
  })
  findAll(
    @Query('includeValues') includeValues?: string,
  ) {
    return this.attributeService.findAll(includeValues === 'true');
  }

  @Post('attributes')
  @UseAuth('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo attribute mới (Admin only)' })
  create(@Body() dto: CreateAttributeDto) {
    return this.attributeService.create(dto);
  }

  @Get('attributes/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chi tiết attribute (kèm values)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attributeService.findOne(id);
  }

  @Put('attributes/:id')
  @UseAuth('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật attribute (Admin only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttributeDto,
  ) {
    return this.attributeService.update(id, dto);
  }

  @Delete('attributes/:id')
  @UseAuth('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa attribute (Admin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.attributeService.remove(id);
  }

  @Get('attributes/:id/values')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách values của một attribute' })
  getValues(@Param('id', ParseIntPipe) id: number) {
    return this.attributeService.findValuesByAttribute(id);
  }

  // ══════════════════════════════════════════════
  //  ATTRIBUTE VALUES
  // ══════════════════════════════════════════════

  @Post('attribute-values')
  @UseAuth('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo attribute value mới (Admin only)' })
  createValue(@Body() dto: CreateAttributeValueDto) {
    return this.attributeService.createValue(dto);
  }

  @Put('attribute-values/:id')
  @UseAuth('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật attribute value (Admin only)' })
  updateValue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttributeValueDto,
  ) {
    return this.attributeService.updateValue(id, dto);
  }

  @Delete('attribute-values/:id')
  @UseAuth('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa attribute value (Admin only)' })
  removeValue(@Param('id', ParseIntPipe) id: number) {
    return this.attributeService.removeValue(id);
  }
}

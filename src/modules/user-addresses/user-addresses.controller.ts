import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UserAddressesService } from './user-addresses.service';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';

@ApiTags('User Addresses')
@ApiBearerAuth()
@Controller('user-addresses')
@UseAuth()
export class UserAddressesController {
  constructor(private readonly userAddressesService: UserAddressesService) {}

  // ─── POST /user-addresses ─────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Thêm địa chỉ giao hàng mới',
    description:
      'Tạo địa chỉ mới cho người dùng hiện tại. Địa chỉ đầu tiên sẽ tự động là mặc định. Nếu isDefault=true, các địa chỉ cũ sẽ bị bỏ mặc định.',
  })
  @ApiBody({ type: CreateUserAddressDto })
  @ApiResponse({ status: 201, description: 'Tạo địa chỉ thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  create(
    @GetCurrentUser('userId') userId: number,
    @Body() dto: CreateUserAddressDto,
  ) {
    return this.userAddressesService.create(userId, dto);
  }

  // ─── GET /user-addresses ──────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách địa chỉ của tôi',
    description:
      'Trả về tất cả địa chỉ giao hàng của người dùng hiện tại. Địa chỉ mặc định luôn đứng đầu.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách địa chỉ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  findAll(@GetCurrentUser('userId') userId: number) {
    return this.userAddressesService.findAllByUser(userId);
  }

  // ─── GET /user-addresses/:id ──────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một địa chỉ' })
  @ApiParam({ name: 'id', description: 'ID của địa chỉ', example: 1 })
  @ApiResponse({ status: 200, description: 'Chi tiết địa chỉ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy địa chỉ hoặc không có quyền truy cập',
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('userId') userId: number,
  ) {
    return this.userAddressesService.findOne(id, userId);
  }

  // ─── PATCH /user-addresses/:id ────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật thông tin địa chỉ',
    description:
      'Cập nhật một hoặc nhiều trường của địa chỉ. Nếu isDefault=true, các địa chỉ khác sẽ bị bỏ mặc định.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của địa chỉ cần cập nhật',
    example: 1,
  })
  @ApiBody({ type: UpdateUserAddressDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa chỉ' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('userId') userId: number,
    @Body() dto: UpdateUserAddressDto,
  ) {
    return this.userAddressesService.update(id, userId, dto);
  }

  // ─── PATCH /user-addresses/:id/set-default ────────────────────────────────────

  @Patch(':id/set-default')
  @ApiOperation({
    summary: 'Đặt địa chỉ làm mặc định',
    description:
      'Chuyển địa chỉ được chỉ định thành địa chỉ giao hàng mặc định. Tất cả địa chỉ khác sẽ bị bỏ mặc định.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của địa chỉ muốn đặt làm mặc định',
    example: 2,
  })
  @ApiResponse({ status: 200, description: 'Đã đặt làm địa chỉ mặc định' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa chỉ' })
  setDefault(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('userId') userId: number,
  ) {
    return this.userAddressesService.setDefault(id, userId);
  }

  // ─── DELETE /user-addresses/:id ───────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa địa chỉ',
    description:
      'Xóa mềm (soft delete) địa chỉ. Nếu đây là địa chỉ mặc định, hệ thống sẽ tự động chọn địa chỉ khác làm mặc định.',
  })
  @ApiParam({ name: 'id', description: 'ID của địa chỉ cần xóa', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Đã xóa địa chỉ thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Đã xóa địa chỉ thành công.' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa chỉ' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('userId') userId: number,
  ) {
    return this.userAddressesService.remove(id, userId);
  }

  // ─── GET /user-addresses/admin/user/:userId ───────────────────────────────────

  @Get('admin/user/:userId')
  @UseAuth('admin')
  @ApiOperation({
    summary: '[Admin] Lấy tất cả địa chỉ (kể cả đã xóa) của một user',
  })
  @ApiParam({ name: 'userId', description: 'ID của user', example: 5 })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tất cả địa chỉ (kể cả soft-deleted)',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền admin' })
  findAllForAdmin(@Param('userId', ParseIntPipe) userId: number) {
    return this.userAddressesService.findAllByUserForAdmin(userId);
  }
}

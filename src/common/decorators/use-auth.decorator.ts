import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AtGuard } from '@common/guards/at.guard';

export function UseAuth() {
  return applyDecorators(
    // 1. Kích hoạt Guard để bảo vệ API (Logic)
    UseGuards(AtGuard),

    // 2. Kết nối với cấu hình 'access-token' bạn đã tạo trong Swagger (UI)
    ApiBearerAuth('access-token'),

    // 3. (Tùy chọn) Thêm thông báo lỗi mặc định cho Swagger
    ApiResponse({
      status: 401,
      description: 'Chưa xác thực hoặc Token không hợp lệ',
    }),
    ApiResponse({ status: 403, description: 'Không có quyền truy cập' }),
  );
}

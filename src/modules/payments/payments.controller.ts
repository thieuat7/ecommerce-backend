import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import type { MoMoIpnPayload } from './interfaces/momo.interface';
import { UseAuth } from '@common/decorators/use-auth.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── TẠO THANH TOÁN MOMO ─────────────────────────────────────────────────
  @UseAuth()
  @Post('momo/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo yêu cầu thanh toán qua MoMo' })
  async processMoMoPayment(@Body() createPaymentDto: CreatePaymentDto) {
    // Truyền thêm orderId vào hàm payWithMoMoMethod
    const data = await this.paymentsService.payWithMoMoMethod(
      createPaymentDto.orderId,
      createPaymentDto.amount,
    );

    return {
      message: 'Tạo link thanh toán MoMo thành công',
      data,
    };
  }

  // ─── XỬ LÝ IPN (WEBHOOK) TỪ MOMO ───────────────────────────────────────────
  // Không dùng @UseAuth — MoMo gọi trực tiếp từ server của họ, không mang token
  @Post('momo/ipn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'IPN Webhook — MoMo gọi về khi có kết quả thanh toán',
  })
  async handleMoMoIpn(@Body() payload: MoMoIpnPayload) {
    return this.paymentsService.handleMoMoIpn(payload);
  }
}

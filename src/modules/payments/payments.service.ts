import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AxiosError } from 'axios';
import * as crypto from 'crypto';
import { lastValueFrom } from 'rxjs';

import {
  MoMoConfig,
  MoMoIpnPayload,
  MoMoResponse,
} from './interfaces/momo.interface';
import { Payment } from './entities/payment.entity';
import { PaymentMethod, PaymentStatus } from './enums/payment.enum';

@Injectable()
export class PaymentsService {
  private readonly momoConfig: MoMoConfig;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    // 1. Tiêm Payment Repository để làm việc với Database
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {
    this.momoConfig = {
      accessKey: this.configService.getOrThrow<string>('MOMO_ACCESS_KEY'),
      secretKey: this.configService.getOrThrow<string>('MOMO_SECRET_KEY'),
      partnerCode: this.configService.getOrThrow<string>('MOMO_PARTNER_CODE'),
      redirectUrl: this.configService.getOrThrow<string>('MOMO_REDIRECT_URL'),
      ipnUrl: this.configService.getOrThrow<string>('MOMO_IPN_URL'),
      apiUrl: this.configService.getOrThrow<string>('MOMO_API_URL'),
      partnerName: this.configService.getOrThrow<string>('MOMO_PARTNER_NAME'),
      storeId: this.configService.getOrThrow<string>('MOMO_STORE_ID'),
      requestType: this.configService.getOrThrow<string>('MOMO_REQUEST_TYPE'),
      lang: this.configService.getOrThrow<string>('MOMO_LANG'),
    };
  }

  // 2. Thêm systemOrderId để biết thanh toán này thuộc về đơn hàng nào
  async payWithMoMoMethod(
    systemOrderId: number,
    amount: string,
  ): Promise<MoMoResponse> {
    const {
      partnerCode,
      apiUrl,
      partnerName,
      storeId,
      requestType,
      redirectUrl,
      ipnUrl,
      lang,
    } = this.momoConfig;

    const orderInfo = `Thanh toán đơn hàng #${systemOrderId} qua MoMo`;

    // Tạo mã đơn hàng gửi cho MoMo (Phải là duy nhất)
    const momoOrderId = `${partnerCode}_${systemOrderId}_${new Date().getTime()}`;
    const requestId = momoOrderId; // Thông thường requestId có thể giống orderId

    // Mã hóa extraData = Base64(JSON) — decode lại khi nhận IPN
    const extraDataRaw = JSON.stringify({ orderId: systemOrderId });
    const extraData = Buffer.from(extraDataRaw).toString('base64');

    const orderGroupId = '';
    const autoCapture = true;

    // ==========================================
    // 3. LƯU THÔNG TIN VÀO DATABASE TRƯỚC KHI GỌI MOMO
    // ==========================================
    const newPayment = this.paymentRepository.create({
      amount: parseFloat(amount),
      paymentMethod: PaymentMethod.MOMO,
      status: PaymentStatus.PENDING,
      transactionId: momoOrderId,
      order: { id: systemOrderId },
      // publicId tự sinh nhờ @Generated('uuid') trong entity
      // paidAt để null cho đến khi nhận IPN thành công
    });

    await this.paymentRepository.save(newPayment);

    // Lấy chữ ký từ hàm helper
    const signature = this.createSignature({
      amount,
      extraData,
      ipnUrl,
      orderId: momoOrderId,
      orderInfo,
      partnerCode,
      redirectUrl,
      requestId,
      requestType,
    });

    const requestBody = {
      partnerCode,
      partnerName,
      storeId,
      requestId,
      amount,
      orderId: momoOrderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang,
      requestType,
      autoCapture,
      extraData,
      orderGroupId,
      signature,
    };

    try {
      const response = await lastValueFrom(
        this.httpService.post<MoMoResponse>(apiUrl, requestBody),
      );

      // Kiểm tra MoMo trả về payUrl hợp lệ
      if (!response.data?.payUrl) {
        // Nếu MoMo từ chối tạo link, bạn có thể cập nhật trạng thái Payment thành FAILED ở đây nếu muốn
        throw new BadRequestException(
          response.data?.message || 'Tạo thanh toán thất bại',
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const axiosError = error as AxiosError<{ message?: string }>;
      console.error(
        'MoMo Error:',
        axiosError.response?.data ?? axiosError.message,
      );
      throw new HttpException(
        'Lỗi khi thanh toán qua MoMo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Xử LÝ IPN TỪ MOMO (WEBHOOK) ──────────────────────────────────────────
  async handleMoMoIpn(payload: MoMoIpnPayload): Promise<{ message: string }> {
    const {
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = payload;

    // Bước 1: Xác thực chữ ký HMAC-SHA256 — đảm bảo request đến từ MoMo
    const rawSignature =
      `accessKey=${this.momoConfig.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${this.momoConfig.partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const expectedSignature = crypto
      .createHmac('sha256', this.momoConfig.secretKey)
      .update(rawSignature)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Chữ ký IPN không hợp lệ');
    }

    // Bước 2: Tìm bản ghi Payment theo transactionId (= momoOrderId)
    const payment = await this.paymentRepository.findOne({
      where: { transactionId: orderId },
    });

    if (!payment) {
      // Không ném lỗi — trả 200 OK để MoMo không retry lỗi
      return { message: 'Payment record not found, ignored' };
    }

    // Bước 3: Cập nhật trạng thái dựa vào resultCode (0 = thành công)
    if (resultCode === 0) {
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date(); // Ghi lại thời điểm thanh toán thành công
    } else {
      payment.status = PaymentStatus.FAILED;
    }

    // Bước 4: Lưu mã giao dịch MoMo (transId) vào DB để tra cứu sau
    payment.momoTransId = String(transId);

    await this.paymentRepository.save(payment);

    return { message: 'IPN xử lý thành công' };
  }

  private createSignature(params: {
    amount: string;
    extraData: string;
    ipnUrl: string;
    orderId: string;
    orderInfo: string;
    partnerCode: string;
    redirectUrl: string;
    requestId: string;
    requestType: string;
  }): string {
    const rawSignature = `accessKey=${this.momoConfig.accessKey}&amount=${params.amount}&extraData=${params.extraData}&ipnUrl=${params.ipnUrl}&orderId=${params.orderId}&orderInfo=${params.orderInfo}&partnerCode=${params.partnerCode}&redirectUrl=${params.redirectUrl}&requestId=${params.requestId}&requestType=${params.requestType}`;

    return crypto
      .createHmac('sha256', this.momoConfig.secretKey)
      .update(rawSignature)
      .digest('hex');
  }
}

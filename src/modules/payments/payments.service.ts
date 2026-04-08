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

import { MoMoConfig, MoMoResponse } from './interfaces/momo.interface';
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
    const extraData = '';
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

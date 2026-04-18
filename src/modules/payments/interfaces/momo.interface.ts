export interface MoMoConfig {
  accessKey: string;
  secretKey: string;
  partnerCode: string;
  redirectUrl: string;
  ipnUrl: string;
  apiUrl: string;
  partnerName: string;
  storeId: string;
  requestType: string;
  lang: string;
}

export interface MoMoResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl: string;
  shortLink: string;
}

// Payload MoMo POST đến IPN URL khi có kết quả thanh toán
export interface MoMoIpnPayload {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number; // Mã giao dịch phía MoMo
  resultCode: number; // 0 = thành công
  message: string;
  payType: string;
  responseTime: number;
  extraData: string; // Base64 của dữ liệu bổ sung
  signature: string; // Dùng để xác thực IPN hợp lệ
}

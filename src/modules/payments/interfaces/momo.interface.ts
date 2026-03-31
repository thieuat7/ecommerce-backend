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

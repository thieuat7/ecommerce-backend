export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  MOMO = 'momo',
  VNPAY = 'vnpay',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

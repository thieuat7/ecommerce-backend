# SKILL: Payments Module

version: 1.0.0
scope: module
module: payments
depends-on: [ecommerce-core, orders]
triggers: ["payment", "thanh toán", "momo", "ipn", "callback", "refund", "payment status", "MoMo"]

---

## When to Use

Load skill này khi:
- Tích hợp hoặc sửa MoMo payment gateway
- Xử lý IPN (Instant Payment Notification) callback
- Update payment status từ gateway response
- Thêm payment method mới
- Debug payment flow

---

## Module Responsibilities

- Tạo payment request đến MoMo
- Xử lý IPN callback (verify signature + update DB)
- Quản lý Payment entity lifecycle
- Tích hợp với Orders module (update order status sau payment)

---

## Key Files

```
src/modules/payments/
├── entities/payment.entity.ts
├── enums/payment.enum.ts              PaymentMethod, PaymentStatus
├── interfaces/momo.interface.ts       MoMoConfig, MoMoResponse, MoMoIpnPayload
├── dto/create-payment.dto.ts
├── dto/update-payment.dto.ts
├── payments.service.ts
├── payments.controller.ts
└── payments.module.ts
```

---

## Data Model

```typescript
Payment {
  id: number
  orderId: number          // FK → orders (OneToOne)
  method: PaymentMethod    // MOMO | COD | BANK_TRANSFER
  status: PaymentStatus    // PENDING | PAID | FAILED | REFUNDED
  amount: number           // decimal(14,2)
  transactionId: string    // ID từ payment gateway (MoMo requestId)
  gatewayOrderId: string   // ID của order bên phía gateway
  paidAt: Date | null
  createdAt / updatedAt
}

PaymentMethod { MOMO = 'momo', COD = 'cod' }
PaymentStatus { PENDING = 'pending', PAID = 'paid', FAILED = 'failed', REFUNDED = 'refunded' }
```

---

## Business Rules

### R1: MoMo Signature Verification (bắt buộc)
```typescript
// IPN callback phải verify HMAC-SHA256 trước khi xử lý
const rawSignature = `accessKey=${accessKey}&amount=${amount}&...`;
const expectedSig = crypto
  .createHmac('sha256', secretKey)
  .update(rawSignature)
  .digest('hex');
if (expectedSig !== payload.signature) throw new BadRequestException('Invalid signature');
```
Không bao giờ bỏ qua bước verify signature — đây là security gate.

### R2: IPN Idempotency
```
IPN có thể gửi nhiều lần. Phải check:
- Nếu payment.status đã là PAID → bỏ qua, trả 200 OK
- Không process duplicate
```

### R3: Config via Environment
```typescript
// Tất cả MoMo config qua ConfigService — không hardcode
accessKey:   MOMO_ACCESS_KEY
secretKey:   MOMO_SECRET_KEY
partnerCode: MOMO_PARTNER_CODE
redirectUrl: MOMO_REDIRECT_URL
ipnUrl:      MOMO_IPN_URL
apiUrl:      MOMO_API_URL
```

### R4: Payment ↔ Order Coupling
```
Khi payment PAID:
  → OrdersService.updateStatus(orderId, CONFIRMED)
  → Deduct stock

Khi payment FAILED:
  → Order vẫn PENDING (user có thể retry)
  → Không deduct stock
```

---

## Common Workflows

### Workflow 1: Initiate MoMo Payment

```
1. User POST /payments/momo { orderId }
2. Load order, verify owner + status === PENDING
3. Tạo Payment entity (status=PENDING, method=MOMO)
4. Build MoMo request payload, sign HMAC
5. Call MoMo API → nhận payUrl
6. Return payUrl to client
7. Client redirect đến MoMo
```

### Workflow 2: MoMo IPN (server callback)

```
POST /payments/momo/ipn  ← MoMo calls this

1. Parse payload (orderId, amount, resultCode, signature, ...)
2. Verify HMAC signature → reject nếu sai
3. Load Payment by transactionId / gatewayOrderId
4. Idempotency check
5. resultCode === 0 (success):
   → payment.status = PAID
   → payment.paidAt = now
   → call ordersService.confirm(orderId) [deduct stock]
6. resultCode !== 0 (fail):
   → payment.status = FAILED
7. Return 200 { message: 'IPN received' } (MoMo cần nhận 200)
```

---

## API Endpoints

```
POST /payments/momo          Initiate MoMo payment
POST /payments/momo/ipn      IPN callback (MoMo server)
GET  /payments/:orderId      Lấy payment info của order
```

---

## Anti-patterns

| Sai | Đúng |
|---|---|
| Bỏ qua signature verify ở IPN | Luôn verify HMAC trước khi xử lý |
| Deduct stock khi tạo payment | Chỉ deduct khi payment PAID |
| Process IPN nhiều lần | Check idempotency trước |
| Hardcode secretKey trong code | Chỉ đọc qua ConfigService |
| Return 4xx khi IPN lỗi | Luôn 200 cho MoMo, log error internal |

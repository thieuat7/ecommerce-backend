# SKILL: Orders Module

version: 1.0.0
scope: module
module: orders
depends-on: [ecommerce-core, payments, products, users, user-addresses]
triggers: ["order", "đơn hàng", "checkout", "place order", "order status", "cancel order", "order history"]

---

## When to Use

Load skill này khi:
- Tạo/sửa/đọc logic liên quan đến đơn hàng
- Xử lý order status transitions
- Tính toán total amount, order items
- Liên quan đến checkout flow
- Xử lý payment callback và update order

---

## Module Responsibilities

- Tạo đơn hàng từ cart items
- Quản lý vòng đời đơn hàng (status machine)
- Lưu snapshot địa chỉ giao hàng tại thời điểm đặt
- Tích hợp với Payment module khi thanh toán
- Deduct stock khi order xác nhận
- Hủy đơn và hoàn kho

---

## Key Files

```
src/modules/orders/
├── entities/order.entity.ts         Order aggregate root
├── enums/order-status.enum.ts       OrderStatus state machine
├── dto/create-order.dto.ts          Checkout payload
├── dto/update-order.dto.ts          Status update payload
├── orders.service.ts                Business logic
├── orders.module.ts                 Module registration
├── my-orders.controller.ts          User-facing endpoints
└── admin-orders.controller.ts       Admin endpoints
```

---

## Data Model

```typescript
Order {
  id: number                     // PK auto-increment
  orderCode: string              // unique, format: ORD-{timestamp}-{random}
  userId: number                 // FK → users
  userAddressId: number | null   // FK → user_addresses (SET NULL on delete)
  totalAmount: number            // decimal(14,2)
  customerName: string | null    // SNAPSHOT — không thay đổi sau khi tạo
  customerPhone: string | null   // SNAPSHOT
  shippingAddress: string        // SNAPSHOT text đầy đủ
  status: OrderStatus            // enum state machine
  createdAt / updatedAt / deletedAt
}

Relations:
  Order -> User (ManyToOne)
  Order -> UserAddress (ManyToOne, nullable)
  Order -> Payment (OneToOne)
  Order -> OrderItem[] (OneToMany, cascade)
  OrderItem -> ProductVariant (ManyToOne)
  OrderItem -> Product (ManyToOne)
```

---

## OrderStatus State Machine

```
PENDING → CONFIRMED → SHIPPING → DELIVERED
    ↓           ↓
CANCELLED   CANCELLED

Rules:
- PENDING: chờ xác nhận, có thể cancel
- CONFIRMED: đã xác nhận, stock đã deduct
- SHIPPING: đang vận chuyển, không thể cancel
- DELIVERED: hoàn tất
- CANCELLED: đã hủy, stock đã hoàn

Transitions được phép:
  PENDING    → CONFIRMED | CANCELLED
  CONFIRMED  → SHIPPING  | CANCELLED
  SHIPPING   → DELIVERED
  DELIVERED  → (terminal)
  CANCELLED  → (terminal)
```

---

## Business Rules

### R1: Snapshot Address
Khi tạo Order, bắt buộc lưu snapshot:
```typescript
customerName: address.recipientName
customerPhone: address.phone
shippingAddress: `${address.street}, ${address.ward}, ${address.district}, ${address.city}`
```
Không được dùng `order.userAddress.recipientName` khi hiển thị — dùng `order.customerName`.

### R2: Stock Deduction Timing
- Stock bị deduct khi status chuyển → `CONFIRMED` (không phải lúc tạo PENDING)
- Stock được hoàn khi status chuyển → `CANCELLED`
- Dùng transaction để đảm bảo atomicity

### R3: Order Code Generation
```typescript
// Format: ORD-YYYYMMDD-XXXXXX (6 ký tự random hex)
const code = `ORD-${dateStr}-${randomHex(6).toUpperCase()}`;
```
Phải unique — dùng retry loop nếu conflict.

### R4: Total Amount Validation
```
totalAmount = SUM(orderItem.price * orderItem.quantity)
```
Validate server-side, không trust client-sent total.

### R5: Relations Loading
```typescript
// User queries (không cần user info)
const USER_ORDER_RELATIONS = [
  'orderItems', 'orderItems.variant',
  'orderItems.variant.options',
  'orderItems.variant.options.attributeValue',
  'orderItems.variant.options.attributeValue.attribute',
  'orderItems.product', 'payment',
];

// Admin queries (cần user info)
const ADMIN_ORDER_RELATIONS = ['user', ...USER_ORDER_RELATIONS];
```

---

## Common Workflows

### Workflow 1: Create Order (Checkout)

```
1. Validate user có cart items hợp lệ
2. Load UserAddress, validate là của user
3. Kiểm tra stock từng variant (>= quantity)
4. Tính totalAmount server-side
5. Begin transaction:
   a. Tạo Order với status=PENDING
   b. Tạo OrderItems
   c. Snapshot address → customerName, customerPhone, shippingAddress
6. Commit
7. (Async) Trigger payment flow nếu method là MoMo
```

### Workflow 2: Confirm Order (Admin)

```
1. Load order, verify status === PENDING
2. Begin transaction:
   a. Deduct stock: variant.stock -= orderItem.quantity
   b. Update order.status = CONFIRMED
   c. Log stock change vào stock_logs
3. Commit
```

### Workflow 3: Cancel Order

```
1. Load order
2. Verify transition hợp lệ (PENDING hoặc CONFIRMED)
3. Begin transaction:
   a. Nếu status === CONFIRMED: hoàn kho (stock += qty)
   b. Update order.status = CANCELLED
   c. Nếu có payment đã thanh toán: trigger refund flow
4. Commit
```

### Workflow 4: MoMo IPN Callback

```
1. Verify HMAC signature từ MoMo
2. Load Payment bằng orderId từ payload
3. Nếu resultCode === 0 (success):
   a. Update payment.status = PAID
   b. Update order.status = CONFIRMED
   c. Deduct stock
4. Nếu resultCode !== 0: update payment.status = FAILED
```

---

## API Endpoints

### User endpoints (my-orders.controller.ts)
```
GET  /orders/my           Lấy danh sách đơn hàng của user hiện tại
GET  /orders/my/:id       Chi tiết đơn hàng (verify owner)
POST /orders              Tạo đơn hàng mới (checkout)
POST /orders/:id/cancel   Hủy đơn hàng
```

### Admin endpoints (admin-orders.controller.ts)
```
GET   /admin/orders          Danh sách tất cả orders (có filter/pagination)
GET   /admin/orders/:id      Chi tiết bất kỳ order
PATCH /admin/orders/:id/status  Cập nhật status
```

---

## Anti-patterns

| Sai | Đúng |
|---|---|
| Dùng `address.recipientName` khi hiển thị order | Dùng `order.customerName` (snapshot) |
| Deduct stock khi tạo PENDING | Deduct khi CONFIRMED |
| Tính totalAmount từ client | Tính server-side từ variant.price |
| Update status bất kỳ → bất kỳ | Validate state machine transitions |
| Load order không có relations | Luôn load với USER_ORDER_RELATIONS |
| Hard delete order | Soft delete (deletedAt) |

---

## Error Codes

```
NotFoundException:   order không tồn tại
ForbiddenException:  user cố access order của người khác
BadRequestException: transition không hợp lệ, stock không đủ
ConflictException:   orderCode duplicate (retry tự động)
```

# SKILL: Carts Module

version: 1.0.0
scope: module
module: carts
depends-on: [ecommerce-core, products, variant, users]
triggers: ["cart", "giỏ hàng", "cart item", "add to cart", "update cart", "remove from cart"]

---

## When to Use

Load skill này khi:
- Thêm/xóa/cập nhật items trong giỏ hàng
- Đọc giỏ hàng của user
- Chuyển giỏ hàng → order (checkout)
- Validate stock trước khi checkout

---

## Module Responsibilities

- Mỗi user có tối đa 1 Cart active
- Quản lý CartItems (1 variant = 1 line item)
- Validate stock availability khi add/update
- Tính subtotal realtime từ variant.price

---

## Data Model

```typescript
Cart {
  id: number
  userId: number    // unique — 1 user 1 cart
  createdAt / updatedAt
}

CartItem {
  id: number
  cartId: number
  variantId: number   // FK → product_variants
  productId: number   // FK → products (denormalize để query nhanh)
  quantity: number    // >= 1
}
```

---

## Business Rules

### R1: One Cart Per User
```typescript
// Get or create cart cho user
let cart = await cartRepo.findOne({ where: { userId } });
if (!cart) cart = await cartRepo.save({ userId });
```

### R2: Merge Duplicate CartItem
```
Nếu user add cùng variantId đã có trong cart:
  → Tăng quantity, không tạo row mới
```

### R3: Stock Validation on Add
```
Trước khi add/update quantity:
1. Load variant.stock
2. Kiểm tra requestedQty <= variant.stock
3. Nếu không đủ → BadRequestException
```

### R4: Cart → Order Transition
```
Khi checkout:
1. Load cart + cartItems + variants
2. Validate từng item còn đủ stock
3. Tạo Order + OrderItems từ cart data
4. KHÔNG xóa cart — clear items sau khi order tạo thành công
```

---

## API Endpoints

```
GET    /carts/my           Lấy cart của user hiện tại
POST   /carts/my/items     Thêm item vào cart
PATCH  /carts/my/items/:id Cập nhật quantity
DELETE /carts/my/items/:id Xóa item
DELETE /carts/my           Clear toàn bộ cart
```

---

## Anti-patterns

| Sai | Đúng |
|---|---|
| Tạo nhiều cart cho 1 user | Get-or-create, 1 cart per user |
| Add item mới khi variant đã có | Merge quantity |
| Trust client-sent price | Luôn lấy price từ variant entity |
| Xóa cart sau checkout | Clear items, giữ cart entity |

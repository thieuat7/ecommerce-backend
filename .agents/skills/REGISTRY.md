# Agent Skills Registry

version: 1.0.0
updated: 2026-06-03

---

## How Agents Use This Registry

1. Agent nhận task từ user
2. Đọc REGISTRY.md này để tìm skill liên quan
3. Load skill file tương ứng
4. Apply rules và workflows từ skill đó

**Load order**: luôn load `ecommerce-core` trước, sau đó load module skill cụ thể.

---

## Skill Index

| Key | Skill File | Triggers |
|-----|-----------|----------|
| `ecommerce-core` | [.agents/skills/ecommerce-core/SKILL.md](./ecommerce-core/SKILL.md) | module, entity, service, controller, dto, convention |
| `orders` | [src/modules/orders/skills/SKILL.md](../../src/modules/orders/skills/SKILL.md) | order, đơn hàng, checkout, order status, cancel |
| `products` | [src/modules/products/skills/SKILL.md](../../src/modules/products/skills/SKILL.md) | product, sản phẩm, variant, stock, image, slug |
| `payments` | [src/modules/payments/skills/SKILL.md](../../src/modules/payments/skills/SKILL.md) | payment, thanh toán, momo, ipn, callback |
| `users` | [src/modules/users/skills/SKILL.md](../../src/modules/users/skills/SKILL.md) | user, profile, role, permission |
| `carts` | [src/modules/carts/skills/SKILL.md](../../src/modules/carts/skills/SKILL.md) | cart, giỏ hàng, add to cart, checkout |

---

## Module → Skill Mapping (Full)

```
Module                    Skill File
──────────────────────────────────────────────────────────────
auth                      (no dedicated skill — xem ecommerce-core)
users                     src/modules/users/skills/SKILL.md
roles                     (no dedicated skill — xem users skill)
categories                (no dedicated skill — xem products skill)
products                  src/modules/products/skills/SKILL.md
variant                   src/modules/products/skills/SKILL.md
attribute                 src/modules/products/skills/SKILL.md
stock-logs                src/modules/products/skills/SKILL.md
storage                   (no dedicated skill — xem ecommerce-core)
carts                     src/modules/carts/skills/SKILL.md
cart-items                src/modules/carts/skills/SKILL.md
orders                    src/modules/orders/skills/SKILL.md
order-items               src/modules/orders/skills/SKILL.md
payments                  src/modules/payments/skills/SKILL.md
user-addresses            src/modules/users/skills/SKILL.md
```

---

## Dependency Graph

```
ecommerce-core (must load first)
    │
    ├── products ──→ variant, attribute, stock-logs, storage, categories
    ├── users    ──→ roles, auth, user-addresses
    ├── carts    ──→ products, variant, users
    ├── orders   ──→ payments, products, users, user-addresses
    └── payments ──→ orders
```

---

## Agent Decision Flow

```
Task received
    │
    ▼
Keywords match "order" / "đơn hàng"?
    ├── YES → Load: ecommerce-core + orders
    └── NO  → Keywords match "product" / "variant"?
                  ├── YES → Load: ecommerce-core + products
                  └── NO  → Keywords match "payment" / "momo"?
                                ├── YES → Load: ecommerce-core + payments
                                └── NO  → Load: ecommerce-core only
```

---

## Registering a New Skill

Khi thêm module mới:

```
1. Tạo file:  src/modules/<name>/skills/SKILL.md
2. Thêm dòng vào bảng "Skill Index" ở trên
3. Thêm dòng vào "Module → Skill Mapping"
4. Cập nhật "Dependency Graph" nếu có cross-module deps
5. Tăng `version` của REGISTRY.md
```

---

## Versioning

Format: `MAJOR.MINOR.PATCH`
- PATCH: sửa nội dung, typo, thêm example
- MINOR: thêm rule mới, thêm workflow
- MAJOR: thay đổi kiến trúc lớn, breaking convention change

Mỗi SKILL.md có version riêng — REGISTRY version độc lập.

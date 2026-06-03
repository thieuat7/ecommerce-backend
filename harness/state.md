# HARNESS :: STATE
# Authority: Staff Architect | Scope: All AI Agents | Version: 1.0.0

---

## 0. PURPOSE

Defines the canonical source of truth for every domain object in the system.
Agents MUST use this document to determine where state lives, how to read it,
and who is authoritative when state appears in multiple places.

---

## 1. SOURCES OF TRUTH HIERARCHY

```
Priority 1 — PostgreSQL (via Knex-managed schema + TypeORM runtime)
Priority 2 — MinIO (object keys stored in PostgreSQL, binaries in MinIO)
Priority 3 — In-memory NestJS application state (ephemeral, request-scoped only)
Priority 4 — Harness memory files (agent working notes — NOT application state)
```

**Rule:** If any agent-held belief about domain state contradicts what PostgreSQL
or MinIO holds, PostgreSQL/MinIO wins unconditionally.

---

## 2. DOMAIN OBJECT MAP

### 2.1 User

| Field | DB Table | Column | TypeORM Entity | Notes |
|-------|----------|--------|----------------|-------|
| ID | `users` | `id` | `User.id` | Auto-increment PK |
| Public ID | `users` | `public_id` | `User.publicId` | Stable external ID (UUID or nanoid) |
| Full name | `users` | `full_name` | `User.fullName` | |
| Email | `users` | `email` | `User.email` | Unique, indexed |
| Password hash | `users` | `password` | `User.password` | bcrypt — NEVER log |
| Refresh token hash | `users` | `current_hashed_refresh_token` | `User.currentHashedRefreshToken` | |
| Active flag | `users` | `is_active` | `User.isActive` | Soft-disable |
| Deleted at | `users` | `deleted_at` | `User.deletedAt` | Soft delete |
| Roles | `user_roles` | join table | `User.roles` (ManyToMany) | |

**Authoritative read path:** `UsersService` → `UserRepository` → `users` table

---

### 2.2 Product

| Field | DB Table | Column | TypeORM Entity | Notes |
|-------|----------|--------|----------------|-------|
| ID | `products` | `id` | `Product.id` | |
| Public ID | `products` | `public_id` | `Product.publicId` | |
| Name | `products` | `name` | `Product.name` | Indexed |
| Slug | `products` | `slug` | `Product.slug` | URL-safe unique |
| Base price | `products` | `price` | `Product.price` | Overridden by variant |
| Version | `products` | `version` | `Product.version` | Optimistic locking |
| Is active | `products` | `is_active` | `Product.isActive` | |
| Images | `product_images` | FK `product_id` | `Product.images` | Object keys in MinIO |
| Variants | `product_variants` | FK `product_id` | `Product.variants` | |
| Categories | `product_categories` | join table | `Product.categories` | |

**Image state split:**
- `product_images.image_url` stores the **MinIO object key** (e.g., `products/42/images/cover.jpg`)
- The **binary file** lives in MinIO bucket under that key
- The full URL is generated at read-time via `storage.getPresignedUrl(objectKey)`

**Authoritative read path:** `ProductsService` → `ProductRepository` → `products` + `product_images`

---

### 2.3 Product Variant

| Field | DB Table | Column | TypeORM Entity | Notes |
|-------|----------|--------|----------------|-------|
| ID | `product_variants` | `id` | `ProductVariant.id` | |
| SKU | `product_variants` | `sku` | `ProductVariant.sku` | Globally unique |
| Price | `product_variants` | `price` | `ProductVariant.price` | Overrides product price |
| Stock | `product_variants` | `stock_quantity` | `ProductVariant.stockQuantity` | Decremented on order |
| Version | `product_variants` | `version` | `ProductVariant.version` | Optimistic lock field |
| Is active | `product_variants` | `is_active` | `ProductVariant.isActive` | |
| Option hash | `product_variants` | `option_hash` | `ProductVariant.optionHash` | Deterministic from attribute value IDs |
| Options | `product_variant_options` | FK `variant_id` | `ProductVariant.options` | Attribute values |

**Stock invariant:**
- `stock_quantity >= 0` enforced at application layer (service-level check + pessimistic lock)
- `stock_quantity` is the ONLY source of truth for available inventory
- StockLog entries record every delta — but they are audit trail, not the truth

**Authoritative read path (for order creation):** `DataSource.transaction` with `pessimistic_write` lock on `product_variants`

---

### 2.4 Order

| Field | DB Table | Column | TypeORM Entity | Notes |
|-------|----------|--------|----------------|-------|
| ID | `orders` | `id` | `Order.id` | |
| Order code | `orders` | `order_code` | `Order.orderCode` | Unique, human-readable |
| User | `orders` | `user_id` | `Order.userId` | FK to users |
| Address FK | `orders` | `user_address_id` | `Order.userAddressId` | Historical reference only |
| Total | `orders` | `total_amount` | `Order.totalAmount` | Snapshot at creation |
| Status | `orders` | `status` | `Order.status` | Enum: order-status.enum.ts |
| Shipping addr | `orders` | `shipping_address` | `Order.shippingAddress` | **Snapshot text — not a FK** |
| Customer name | `orders` | `customer_name` | `Order.customerName` | **Snapshot** |
| Customer phone | `orders` | `customer_phone` | `Order.customerPhone` | **Snapshot** |

**Snapshot invariant:** `shippingAddress`, `customerName`, `customerPhone` are FROZEN at order creation time.
They MUST NOT be updated to reflect subsequent user profile changes.

**Status state machine (canonical):**
```
PENDING ──────────────────────────────► PROCESSING ──► SHIPPED ──► DELIVERED
   │                                        │
   └────────────────────► CANCELLED ◄───────┘
```
Terminal states: `CANCELLED`, `DELIVERED`
Valid user transitions: `PENDING → CANCELLED`
Valid admin transitions: all except from terminal states

**Authoritative read path:**
- User context: `OrdersService.findOneByUserId(id, userId)` — always scoped by userId
- Admin context: `OrdersService.findOneForAdmin(orderId)` — unscoped

---

### 2.5 Order Item

| Field | DB Table | Column | TypeORM Entity | Notes |
|-------|----------|--------|----------------|-------|
| ID | `order_items` | `id` | `OrderItem.id` | |
| Order | `order_items` | `order_id` | `OrderItem.order` | |
| Product (XOR) | `order_items` | `product_id` | `OrderItem.product` | NULL if variant set |
| Variant (XOR) | `order_items` | `variant_id` | `OrderItem.variant` | NULL if product set |
| Quantity | `order_items` | `quantity` | `OrderItem.quantity` | > 0 enforced by CHECK |
| Price snapshot | `order_items` | `price_at_purchase` | `OrderItem.priceAtPurchase` | Frozen at creation |
| Product name | `order_items` | `product_name` | `OrderItem.productName` | Snapshot |
| Variant name | `order_items` | `variant_name` | `OrderItem.variantName` | Snapshot (e.g., "Red / 128GB") |
| SKU | `order_items` | `sku` | `OrderItem.sku` | Snapshot |

**XOR invariant (DB CHECK constraint):**
```sql
(product_id IS NOT NULL AND variant_id IS NULL)
OR
(product_id IS NULL AND variant_id IS NOT NULL)
```
This is enforced at DB level. Application code MUST set `product: null` when setting `variant` and vice versa.

---

### 2.6 Cart

| Field | DB Table | Column | TypeORM Entity | Notes |
|-------|----------|--------|----------------|-------|
| ID | `carts` | `id` | `Cart.id` | |
| User | `carts` | `user_id` | `Cart.userId` | Unique (one cart per user) |
| Items | `cart_items` | FK `cart_id` | `Cart.items` | |

**Invariant:** One cart per user — enforced by `UNIQUE(user_id)` on `carts` table.
`CartsService` MUST upsert (find-or-create) the cart on first access.

**Cart item invariant:**
- `UNIQUE(cart_id, product_id, variant_id)` — prevents duplicate line items
- `quantity > 0` — enforced at service layer

---

### 2.7 User Address

| Field | DB Table | Column | TypeORM Entity | Notes |
|-------|----------|--------|----------------|-------|
| ID | `user_addresses` | `id` | `UserAddress.id` | |
| User | `user_addresses` | `user_id` | `UserAddress.userId` | Ownership FK |
| Recipient | `user_addresses` | `recipient_name` | `UserAddress.recipientName` | |
| Phone | `user_addresses` | `phone_number` | `UserAddress.phoneNumber` | |
| Address line | `user_addresses` | `address_line` | `UserAddress.addressLine` | |
| Ward | `user_addresses` | `ward` | `UserAddress.ward` | |
| District | `user_addresses` | `district` | `UserAddress.district` | |
| Province | `user_addresses` | `province` | `UserAddress.province` | |
| Country | `user_addresses` | `country` | `UserAddress.country` | Default: Vietnam |
| Is default | `user_addresses` | `is_default` | `UserAddress.isDefault` | Boolean |
| Deleted at | `user_addresses` | `deleted_at` | `UserAddress.deletedAt` | Soft delete |

**Ownership rule:** Every read or mutation of a `UserAddress` MUST verify `address.userId === requestingUserId`.

---

## 3. RELATION PRELOAD CONTRACTS

### 3.1 User-facing Order (USER_ORDER_RELATIONS)

```typescript
const USER_ORDER_RELATIONS = [
  'orderItems',
  'orderItems.variant',
  'orderItems.variant.options',
  'orderItems.variant.options.attributeValue',
  'orderItems.variant.options.attributeValue.attribute',
  'orderItems.product',
  'payment',
]
```

### 3.2 Admin-facing Order (ADMIN_ORDER_RELATIONS)

```typescript
const ADMIN_ORDER_RELATIONS = [
  'user',
  ...USER_ORDER_RELATIONS,
]
```

**Rule:** These relation trees are the canonical load patterns. Any agent modifying
order queries MUST use these constants, not ad-hoc relation arrays.

---

## 4. CONCURRENT WRITE STATE MODEL

For any write path where multiple requests may race on the same row:

| Entity | Conflict scenario | Resolution strategy |
|--------|-------------------|---------------------|
| `product_variants.stock_quantity` | Concurrent order placement | Pessimistic write lock + quantity check inside transaction |
| `orders.status` | Concurrent status updates | Transaction + re-read before update |
| `carts` (find-or-create) | Concurrent first cart access | DB UNIQUE constraint absorbs duplicate; catch and re-read |
| `product.version` | Concurrent product edits | Optimistic lock via `version` column (future: add `@VersionColumn()`) |

**Deadlock handling contract:**
- Max retries: 3
- Backoff: `100ms * attempt`
- Throw `ConflictException` after exhausting retries
- Log each retry at `warn` level with attempt count

---

## 5. SOFT DELETE CONTRACT

Tables with `deleted_at`:
- `users`
- `products`
- `categories`
- `orders`
- `user_addresses`

**Rules:**
- Soft-deleted rows MUST NOT appear in any user-facing query
- TypeORM `@DeleteDateColumn()` enables automatic filtering when `softDelete()` / `softRemove()` is used
- Alternatively, `where: { deletedAt: null }` or `IsNull()` must be applied explicitly if not using `@SoftDelete`
- Admin queries MAY include soft-deleted rows when explicitly requested (audit trail)
- Hard `DELETE` is FORBIDDEN for these tables — always soft-delete

---

## 6. AGENT MEMORY MODEL (Ephemeral)

The following are per-conversation agent working state — NOT application state:

| Item | Where stored | Lifetime |
|------|-------------|---------|
| Task progress | `memory/` files | Cross-session |
| Current implementation plan | Conversation context | Current session |
| File read cache | Agent context window | Current session |
| Discovered invariants | This document (permanent) | Permanent |

**Rule:** Agents MUST NOT confuse agent memory with application state.
Decisions about domain correctness are driven by PostgreSQL, not agent notes.

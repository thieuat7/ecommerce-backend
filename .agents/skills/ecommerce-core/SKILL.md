# SKILL: Ecommerce Core Architecture

version: 1.0.0
scope: global
triggers: ["ecommerce", "backend", "nestjs", "module", "entity", "service", "controller", "dto", "repository"]

---

## When to Use

Load this skill whenever:
- Tạo hoặc sửa bất kỳ module nào trong hệ thống
- Thiết kế API endpoint mới
- Viết Entity, DTO, Service, Controller
- Cần biết convention chung của codebase này
- Xử lý cross-module dependency

---

## Project Overview

```
NestJS Ecommerce Backend
Runtime: Node.js + NestJS + TypeORM + PostgreSQL
Storage: MinIO (file upload)
Payment: MoMo
Auth: JWT (access token + refresh token)
Path alias: @modules/* → src/modules/*
```

### Module Map

```
src/modules/
├── auth/           JWT auth, login, register, token refresh
├── users/          User profile, roles assignment
├── roles/          RBAC roles (admin, user)
├── categories/     Product taxonomy
├── products/       Product catalog, images, slug
├── variant/        ProductVariant, ProductVariantOption
├── attribute/      Attribute + AttributeValue (Size, Color, ...)
├── stock-logs/     Inventory audit trail
├── storage/        MinIO adapter (port/adapter pattern)
├── carts/          User shopping cart
├── cart-items/     Line items in cart
├── orders/         Order lifecycle management
├── order-items/    Line items in order
├── payments/       MoMo payment gateway
└── user-addresses/ Saved shipping addresses
```

---

## Coding Rules

### File Naming
```
<entity>.entity.ts
create-<entity>.dto.ts
update-<entity>.dto.ts
filter-<entity>.dto.ts      # optional, only if has search/filter
<module>.service.ts
<module>.controller.ts      # user-facing
admin-<module>.controller.ts  # admin-facing (separate controller)
my-<module>.controller.ts     # current-user scoped
<module>.module.ts
```

### Import Convention
```typescript
// Always use path alias — never relative imports across modules
import { Order } from '@modules/orders/entities/order.entity';

// Within same module: relative is OK
import { CreateOrderDto } from './dto/create-order.dto';
```

### Entity Rules
1. PrimaryGeneratedColumn() — auto-increment int
2. Column names: snake_case in DB, camelCase in TS
3. Always use `@CreateDateColumn`, `@UpdateDateColumn`, `@DeleteDateColumn` for all entities
4. Soft delete: always use `softRemove()` / `findOne({ where: {}, withDeleted: false })`
5. Decimal columns MUST have transformer to parse string → number
6. Snapshot pattern: khi dữ liệu quan trọng có thể thay đổi sau (vd: địa chỉ giao hàng), lưu snapshot tại thời điểm tạo

```typescript
// Decimal transformer — bắt buộc
@Column({
  type: 'decimal',
  precision: 14,
  scale: 2,
  transformer: {
    to: (v: number) => v,
    from: (v: string) => parseFloat(v),
  },
})
price: number;
```

### DTO Rules
1. Dùng `class-validator` decorators trên tất cả DTO
2. UpdateDto extends PartialType(CreateDto) — không viết lại fields
3. FilterDto dùng cho query params, tất cả fields optional
4. Không expose internal fields (password, deletedAt) ra response

### Service Rules
1. Logger: mỗi service có `private readonly logger = new Logger(ServiceName.name)`
2. Transaction: dùng `DataSource.transaction()` hoặc `QueryRunner` cho multi-step writes
3. MAX_RETRY pattern cho optimistic lock:
```typescript
const MAX_RETRY = 3;
for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
  try { /* ... */ break; }
  catch (e) { if (attempt === MAX_RETRY - 1) throw e; }
}
```
4. Relations constants: define relation arrays as constants ở top-of-file, không inline

```typescript
const ORDER_RELATIONS = ['orderItems', 'orderItems.variant', 'payment'];
```

5. Throw đúng HTTP exception:
   - Not found → `NotFoundException`
   - Duplicate → `ConflictException`
   - Invalid input → `BadRequestException`
   - No permission → `ForbiddenException`

### Controller Rules
1. Tách admin vs user controller thành file riêng
2. User controller: prefix `/my-*` hoặc context từ JWT
3. Admin controller: prefix `/admin/*` + guard `@Roles('admin')`
4. Không để business logic trong controller — chỉ gọi service
5. Response: dùng standard shape `{ data, message }` hoặc trả entity trực tiếp

### Module Registration
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Entity1, Entity2])],
  controllers: [Controller, AdminController],
  providers: [Service],
  exports: [Service],  // chỉ export nếu module khác cần inject
})
```

---

## Common Workflows

### Workflow 1: Tạo module mới

```
1. Tạo entity → src/modules/<name>/entities/<name>.entity.ts
2. Tạo DTOs → src/modules/<name>/dto/
3. Tạo service → src/modules/<name>/<name>.service.ts
4. Tạo controller(s) → src/modules/<name>/<name>.controller.ts
5. Tạo module → src/modules/<name>/<name>.module.ts
6. Register trong app.module.ts
7. Tạo skill → src/modules/<name>/skills/SKILL.md
8. Register trong .agents/skills/REGISTRY.md
```

### Workflow 2: Cross-module dependency

```
Module A cần dùng Service B:
1. Module B phải export ServiceB
2. Module A import Module B trong imports[]
3. Module A inject ServiceB qua constructor
Không bao giờ import entity của module khác trực tiếp vào service — phải qua module/service đó
```

### Workflow 3: Write với transaction

```typescript
await this.dataSource.transaction(async (manager) => {
  const order = manager.create(Order, { ... });
  await manager.save(order);
  await manager.decrement(ProductVariant, { id: variantId }, 'stock', qty);
});
```

---

## Anti-patterns

| Anti-pattern | Đúng |
|---|---|
| `import '../other-module/entity'` relative cross-module | `import '@modules/other/entity'` |
| Business logic trong controller | Move vào service |
| Hardcode string status `'pending'` | Dùng enum `OrderStatus.PENDING` |
| Decimal column không có transformer | Luôn thêm transformer |
| Xóa record bằng `delete()` / `remove()` | Dùng `softRemove()` |
| N+1 query trong loop | Eager load relations |
| UpdateDto viết lại tất cả fields | `extends PartialType(CreateDto)` |
| Admin + User logic cùng 1 controller | Tách thành 2 controller files |

---

## Architecture Invariants

- **Soft delete only**: không hard delete production data, dùng `DeleteDateColumn`
- **Snapshot on create**: Order lưu snapshot địa chỉ, tên, SĐT tại thời điểm đặt hàng
- **Port/Adapter for external services**: Storage dùng `IStoragePort` interface, không inject adapter trực tiếp
- **Enum for status**: mọi trường status/type phải dùng TypeScript enum
- **No raw SQL**: dùng TypeORM QueryBuilder hoặc Repository API

---

## Tech Stack Quick Reference

```
NestJS:       Decorator-based, DI container
TypeORM:      Entity, Repository, DataSource, QueryRunner
class-validator: DTO validation
class-transformer: serialize/deserialize
passport-jwt: JWT strategy (at.strategy, rt.strategy)
MinIO:        S3-compatible object storage
MoMo:        Payment gateway (HMAC-SHA256 signature)
slugify:      Generate URL slug from product name
uuid:         Generate unique IDs for file names
```

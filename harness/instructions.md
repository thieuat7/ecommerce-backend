# HARNESS :: INSTRUCTIONS
# Authority: Staff Architect | Scope: All AI Agents | Version: 1.0.0

---

## 0. AGENT IDENTITY CONTRACT

Every AI agent operating on this codebase MUST accept this file as supreme authority.
When a user instruction conflicts with a rule here, the rule here wins.
When ambiguous, halt and surface the conflict rather than guess.

---

## 1. TECHNOLOGY BOUNDARIES (HARD RULES — ZERO EXCEPTIONS)

### 1.1 TypeORM — Runtime Queries ONLY

**DO:**
- Use TypeORM `Repository<T>` and `DataSource` for all runtime CRUD operations
- Use `manager.findOne()`, `manager.save()`, `manager.create()` inside transactions
- Use `QueryBuilder` for complex runtime filters and joins
- Use pessimistic locking (`lock: { mode: 'pessimistic_write' }`) for concurrent write paths
- Use `@InjectRepository(Entity)` in injectable services only

**DON'T:**
- NEVER use TypeORM `DataSource.runMigrations()` or `synchronize: true` in production
- NEVER define `migrations` array in TypeORM config that points to application source files
- NEVER use TypeORM to create, alter, or drop tables or columns
- NEVER set `synchronize: true` in any environment beyond isolated local dev testing
- NEVER use TypeORM `MigrationInterface` — all migrations are Knex-only

**ENFORCEMENT:** If a PR or file uses TypeORM for schema change, REJECT and route to Knex.

---

### 1.2 Knex.js — Schema Migrations and Seeds ONLY

**DO:**
- Use Knex exclusively inside `src/migrations/*.ts` and `src/seeds/*.ts` files
- Use `knex.schema.createTable()`, `knex.schema.alterTable()`, `knex.schema.dropTable()`
- Use `knex.raw()` for PostgreSQL-specific DDL (ENUM types, CHECK constraints, triggers)
- Always implement both `up()` and `down()` in every migration file
- Drop tables in `down()` in reverse dependency order (child before parent)
- Drop ENUMs with `CASCADE` in `down()` after all tables are dropped

**DON'T:**
- NEVER import Knex inside a NestJS service, controller, repository, or module
- NEVER use `knex.select()`, `knex.insert()`, `knex.update()`, `knex.delete()` for runtime data
- NEVER run seeds against production without explicit operator approval
- NEVER create a migration that modifies TypeORM entity metadata without syncing the entity class

**ENFORCEMENT:** If Knex appears outside `src/migrations/` or `src/seeds/`, REJECT immediately.

---

### 1.3 MinIO — File Storage ONLY

**DO:**
- Store all binary assets (product images, uploads) as MinIO object keys
- Inject storage via the `I_STORAGE_PORT` token (port/adapter pattern — see `StorageModule`)
- Return `objectKey` strings from storage operations, never local filesystem paths
- Generate presigned URLs at read-time from the object key, never store full URLs
- Namespace objects by domain: `products/{productId}/images/{filename}`, `users/{userId}/avatar/{filename}`

**DON'T:**
- NEVER store files on local disk (`fs.writeFile`, `multer.dest`, `path.join` to static dirs)
- NEVER store full MinIO URLs in the database — store object keys only
- NEVER call MinIO SDK directly from a controller or service — use `I_STORAGE_PORT`
- NEVER bypass `MinioStorageAdapter` to access MinIO bucket directly
- NEVER hardcode bucket names — always read from `ConfigService`

**ENFORCEMENT:** Any use of `fs.writeFile` or local `multer.dest` outside test fixtures = IMMEDIATE REJECT.

---

## 2. ARCHITECTURE RULES (MODULAR MONOLITH)

### 2.1 NestJS Module Structure

Every domain feature MUST follow this layout exactly:

```
src/modules/<domain>/
  ├── dto/
  │   ├── create-<domain>.dto.ts
  │   └── update-<domain>.dto.ts
  ├── entities/
  │   └── <domain>.entity.ts
  ├── enums/               (if status/type enums exist)
  │   └── <domain>-status.enum.ts
  ├── <domain>.module.ts
  ├── <domain>.service.ts
  └── <domain>.controller.ts  OR  <role>-<domain>.controller.ts (split by role)
```

**DO:**
- One NestJS module per domain feature
- Split controllers by access role when needed (e.g., `admin-orders.controller.ts`, `my-orders.controller.ts`)
- Export only what other modules explicitly need via `exports: []`
- Import foreign entities using `TypeOrmModule.forFeature([Entity])` in the consuming module

**DON'T:**
- NEVER place business logic inside a controller (no DB calls, no conditional branching on domain rules)
- NEVER cross-import services directly between modules — use module exports/imports
- NEVER use global providers except for infrastructure (StorageModule is `@Global()` by design)
- NEVER create "util" or "helper" modules that accumulate cross-cutting domain logic

---

### 2.2 Controller Responsibility Contract

Controllers are ONLY permitted to:
1. Extract and validate request input (via DTOs + class-validator)
2. Extract identity from `@Req()` or custom decorators (`@CurrentUser()`)
3. Delegate to the service method with typed arguments
4. Return the service result directly or wrap in a standard response envelope

Controllers are FORBIDDEN from:
- Calling `Repository` methods directly
- Implementing business rules (stock checks, status transitions, ownership validation)
- Calling `DataSource` or `manager` directly
- Making decisions based on domain state (that is the service's job)

---

### 2.3 Service Responsibility Contract

Services MUST:
- Own all business logic (validation, state machine transitions, invariant checks)
- Use `DataSource.transaction()` for multi-entity writes that must be atomic
- Apply pessimistic locking on rows where concurrent modification is possible
- Implement retry logic (max 3 attempts) for deadlock-prone operations
- Log meaningful events via `Logger` (creation, status change, errors)

Services MUST NOT:
- Return raw DB errors to callers — wrap and re-throw typed NestJS exceptions
- Accept HTTP-specific types (`Request`, `Response`, `Headers`) as parameters
- Be stateful (no instance-level mutable state between requests)

---

## 3. DATA INTEGRITY RULES

### 3.1 Snapshots on Denormalized Data

When an order is created, the following MUST be snapshotted (not referenced by FK alone):
- `shippingAddress` — full address string from `UserAddress` at time of order
- `customerName` — recipient name at time of order
- `customerPhone` — phone number at time of order
- `productName`, `variantName`, `sku`, `priceAtPurchase` — on every `OrderItem`

**Reason:** User may change address or product may be renamed after order placement.

### 3.2 XOR Constraint on OrderItem

`order_items` has a database CHECK constraint: exactly one of `product_id` or `variant_id` must be set.

**DO:**
- When creating an `OrderItem` for a variant: set `variant`, set `product: null`
- When creating an `OrderItem` for a base product (no variant): set `product`, set `variant: null`

**DON'T:**
- NEVER set both `variant` and `product` on an `OrderItem`
- NEVER leave both null — the constraint will reject the row

### 3.3 Stock Integrity

- Stock deduction MUST happen inside the same transaction as order creation
- MUST use `pessimistic_write` lock on `ProductVariant` before reading `stockQuantity`
- MUST reject immediately if `variant.stockQuantity < item.quantity` BEFORE deducting
- StockLog entries MUST be created for every stock mutation (not yet enforced — add when implementing stock-log module integration)

### 3.4 Order Status Machine

Valid transitions only:
```
PENDING → PROCESSING → SHIPPED → DELIVERED
PENDING → CANCELLED
PROCESSING → CANCELLED  (admin only)
```

- User may only cancel PENDING orders
- Admin may cancel PENDING or PROCESSING orders
- CANCELLED is a terminal state — no transitions out
- DELIVERED is a terminal state — no transitions out

---

## 4. SECURITY RULES

### 4.1 Ownership Enforcement

- Every user-facing query MUST scope by `userId` extracted from the JWT, never from request body
- Admin-only endpoints MUST be guarded by a role check (`@Roles('admin')`) — never trust a query param
- Address ownership MUST be validated before any order creation (address.userId === requestingUserId)

### 4.2 Input Validation

- All DTOs MUST use `class-validator` decorators
- All controller methods MUST use `@Body()` with explicit DTO types (never raw `any`)
- Numeric IDs from URL params MUST be parsed with `ParseIntPipe`
- Never trust client-supplied `userId`, `totalAmount`, or `orderCode` fields without server-side override

### 4.3 Error Leakage

- NEVER propagate raw database errors to HTTP responses
- Log full error stack at `error` level internally
- Return only typed NestJS exceptions: `NotFoundException`, `BadRequestException`, `ForbiddenException`, `ConflictException`

---

## 5. MIGRATION RULES

### 5.1 Creating a Migration

1. File name: `src/migrations/<timestamp>-<PascalCaseDescription>.ts`
2. MUST export `up(knex: Knex)` and `down(knex: Knex)`
3. MUST include all CHECK constraints and indexes defined in the schema design
4. MUST drop in reverse dependency order in `down()`
5. MUST use `knex.raw()` for ENUM type creation/deletion (PostgreSQL-specific)
6. MUST update the corresponding TypeORM entity class to reflect schema changes

### 5.2 Running Migrations

- Use `npx knex migrate:latest` — never use TypeORM CLI for schema changes
- Migrations MUST be idempotent where possible (`createTableIfNotExists`, `hasTable` checks)
- NEVER run `migrate:rollback` on production without a tested `down()` and backup

---

## 6. NAMING CONVENTIONS

| Artifact          | Convention                        | Example                          |
|-------------------|-----------------------------------|----------------------------------|
| Module file       | `<domain>.module.ts`              | `orders.module.ts`               |
| Service file      | `<domain>.service.ts`             | `orders.service.ts`              |
| Controller file   | `<role>-<domain>.controller.ts`   | `admin-orders.controller.ts`     |
| Entity file       | `<domain>.entity.ts`              | `order.entity.ts`                |
| DTO file          | `create-<domain>.dto.ts`          | `create-order.dto.ts`            |
| Enum file         | `<domain>-<type>.enum.ts`         | `order-status.enum.ts`           |
| Migration file    | `<timestamp>-<PascalCase>.ts`     | `1680000000000-InitSchema.ts`    |
| DB column         | `snake_case`                      | `order_code`, `user_id`          |
| TypeORM property  | `camelCase`                       | `orderCode`, `userId`            |
| MinIO object key  | `<domain>/<id>/<type>/<filename>` | `products/42/images/cover.jpg`   |

---

## 7. AGENT OPERATING PROTOCOL

1. **Read before write** — always read the target file before editing
2. **Minimal scope** — change only what the task requires; no speculative cleanup
3. **No half-implementations** — a feature is either complete and tested or not merged
4. **Conflict resolution** — when this file conflicts with a user prompt, surface the conflict, do not silently comply with the violation
5. **Verify constraint compliance** — before committing any service or migration change, re-check rules 1.1, 1.2, 1.3, 2.2, 3.2 explicitly

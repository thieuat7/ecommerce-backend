# HARNESS :: TOOLS
# Authority: Staff Architect | Scope: All AI Agents | Version: 1.0.0

---

## 0. PURPOSE

This document defines every tool, command, and external system an AI agent is authorized
to use in this project, along with hard restrictions on what is forbidden.
Agents MUST check this file before invoking any CLI command, API, or SDK.

---

## 1. AUTHORIZED CLI TOOLS

### 1.1 NestJS / Node

| Command | Purpose | Allowed Environments |
|---------|---------|----------------------|
| `npm run start:dev` | Start app with watch mode | local only |
| `npm run build` | Compile TypeScript to dist/ | local, CI |
| `npm run test` | Run unit tests | local, CI |
| `npm run test:e2e` | Run end-to-end tests | local, CI |
| `npx nest g module <name>` | Scaffold a new NestJS module | local only |
| `npx nest g service <name>` | Scaffold a new service | local only |
| `npx nest g controller <name>` | Scaffold a new controller | local only |

**Restriction:** Never use `nest g resource` — it creates all layers at once and bypasses
the required manual review of entity / DTO design before generation.

---

### 1.2 Knex Migrations (SCHEMA ONLY)

| Command | Purpose | Allowed Environments |
|---------|---------|----------------------|
| `npx knex migrate:latest` | Apply all pending migrations | local, staging |
| `npx knex migrate:rollback` | Roll back the last batch | local only |
| `npx knex migrate:make <Name>` | Create a new migration file | local only |
| `npx knex seed:run` | Run all seed files | local, staging (never prod) |
| `npx knex seed:make <name>` | Create a new seed file | local only |
| `npx knex migrate:status` | List applied/pending migrations | local, staging |

**Critical Restrictions:**
- `npx knex migrate:rollback --all` is FORBIDDEN without explicit operator approval and DB backup
- `npx knex seed:run` on production is FORBIDDEN unconditionally
- TypeORM CLI (`ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli`) is FORBIDDEN for schema operations

---

### 1.3 TypeORM CLI (FORBIDDEN for schema — read-only diagnostic only)

TypeORM CLI commands are FORBIDDEN for any schema modification.
The ONLY permitted TypeORM CLI usage is diagnostic:

```bash
# Allowed: show pending TypeORM migrations (informational only — do not apply)
npx typeorm migration:show -d src/database/database.module.ts
```

If TypeORM CLI is used to run or generate migrations: REJECT and route to Knex.

---

### 1.4 Docker / Infrastructure

| Command | Purpose | Allowed Environments |
|---------|---------|----------------------|
| `docker compose up -d` | Start local stack (Postgres + MinIO) | local only |
| `docker compose down` | Stop local stack | local only |
| `docker compose logs -f <service>` | Tail service logs | local only |
| `docker exec -it <container> psql -U postgres ecommerce_db` | Direct DB access | local only |

**Restriction:** Never modify `docker-compose.yml` to bind-mount application source directories into containers — this causes silent state divergence.

---

### 1.5 MinIO CLI (mc)

| Command | Purpose | Allowed Environments |
|---------|---------|----------------------|
| `mc ls <alias>/<bucket>` | List objects | local, staging |
| `mc cp <src> <alias>/<bucket>/<key>` | Upload a file manually | local only |
| `mc rm <alias>/<bucket>/<key>` | Delete a specific object | local only |
| `mc admin info <alias>` | Inspect MinIO server state | local, staging |

**Restriction:** `mc rm --recursive` on any staging or production bucket requires explicit operator sign-off.

---

## 2. AUTHORIZED SDKS AND LIBRARIES

### 2.1 TypeORM (Runtime)

**Authorized patterns:**
```typescript
// Repository injection
@InjectRepository(Order)
private readonly ordersRepository: Repository<Order>

// Simple find
this.ordersRepository.find({ where: { userId }, relations: [...] })
this.ordersRepository.findOne({ where: { id } })

// Save (upsert by primary key)
this.ordersRepository.save(entity)

// Remove
this.ordersRepository.remove(entity)

// Transaction with manager
this.dataSource.transaction(async (manager) => {
  const variant = await manager.findOne(ProductVariant, {
    where: { id },
    lock: { mode: 'pessimistic_write' },
  })
  await manager.save(ProductVariant, variant)
})

// QueryBuilder
this.ordersRepository.createQueryBuilder('order')
  .leftJoinAndSelect('order.orderItems', 'item')
  .where('order.userId = :userId', { userId })
  .getMany()
```

**Forbidden patterns:**
```typescript
// FORBIDDEN: raw schema manipulation
dataSource.query('CREATE TABLE ...')
dataSource.runMigrations()

// FORBIDDEN: synchronize
TypeOrmModule.forRoot({ synchronize: true })  // production — never

// FORBIDDEN: TypeORM migration files
class MyMigration implements MigrationInterface { ... }
```

---

### 2.2 Knex (Schema only)

**Authorized patterns:**
```typescript
// In src/migrations/*.ts ONLY
export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable('table_name', (table) => {
    table.increments('id').primary()
    table.string('field', 255).notNullable()
    table.timestamps(true, true)
  })
  await knex.raw(`CREATE TYPE my_enum AS ENUM ('a', 'b')`)
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('table_name')
  await knex.raw(`DROP TYPE IF EXISTS my_enum CASCADE`)
}
```

**Forbidden patterns:**
```typescript
// FORBIDDEN: runtime data queries with Knex
const orders = await knex('orders').select('*').where({ user_id: 1 })
await knex('products').insert({ name: 'Phone' })

// FORBIDDEN: Knex inside NestJS injectable
@Injectable()
export class OrdersService {
  constructor(private knex: Knex) {} // NEVER
}
```

---

### 2.3 MinIO Storage (via Port/Adapter)

**Authorized patterns:**
```typescript
// In any service that needs storage
@Inject(I_STORAGE_PORT)
private readonly storage: IStoragePort

// Upload
const objectKey = await this.storage.upload(buffer, {
  bucket: this.configService.get('MINIO_BUCKET'),
  key: `products/${productId}/images/${filename}`,
  contentType: 'image/jpeg',
})

// Delete
await this.storage.delete(objectKey)

// Generate presigned URL (read-time only — never store this URL)
const url = await this.storage.getPresignedUrl(objectKey, 3600)
```

**Forbidden patterns:**
```typescript
// FORBIDDEN: direct MinIO SDK outside adapter
import * as Minio from 'minio'
const client = new Minio.Client({ ... })
await client.putObject(bucket, key, buffer)  // bypasses adapter

// FORBIDDEN: storing full URLs in DB
productImage.imageUrl = 'http://minio:9000/bucket/products/42/cover.jpg'  // WRONG
productImage.imageUrl = 'products/42/images/cover.jpg'  // CORRECT — store key

// FORBIDDEN: local disk write
fs.writeFileSync('./uploads/image.jpg', buffer)
```

---

### 2.4 class-validator / class-transformer (DTOs)

**DO:**
- Every DTO property MUST have at least one `class-validator` decorator
- Use `@IsInt()`, `@IsPositive()` for numeric IDs
- Use `@IsEnum(OrderStatus)` for status fields
- Use `@IsArray()` + `@ArrayMinSize(1)` + `@ValidateNested({ each: true })` for nested arrays
- Use `@Type(() => NestedDto)` from `class-transformer` alongside `@ValidateNested`

**DON'T:**
- NEVER use `@IsOptional()` on fields that should always be present
- NEVER skip `@Type()` when using `@ValidateNested()` — transformation will silently fail

---

### 2.5 @nestjs/passport / JWT

**DO:**
- Use `@UseGuards(JwtAuthGuard)` on every protected endpoint
- Use `@UseGuards(RolesGuard)` + `@Roles('admin')` on admin-only endpoints
- Extract `userId` from the JWT payload via `@Req() req` or a `@CurrentUser()` decorator
- Never trust `userId` from request body — always use the authenticated JWT claim

**DON'T:**
- NEVER accept `Authorization` header processing in a controller method manually
- NEVER skip guards on any endpoint that touches user-specific data

---

## 3. READ-ONLY DIAGNOSTIC TOOLS

These tools may be used by agents to inspect state but MUST NOT trigger side effects:

| Tool | Purpose |
|------|---------|
| `git log --oneline -20` | Review recent commit history |
| `git diff HEAD~1` | Inspect last change |
| `git status` | Check working tree state |
| `psql -c "\dt"` | List DB tables (diagnostic) |
| `psql -c "\d+ table_name"` | Inspect table schema (diagnostic) |
| `mc ls alias/bucket --recursive` | List all MinIO objects |

---

## 4. FORBIDDEN TOOLS (UNCONDITIONAL)

The following tools and commands are FORBIDDEN regardless of context:

| Tool / Command | Reason |
|----------------|--------|
| `typeorm migration:generate` | Generates TypeORM migrations — violates Knex-only rule |
| `typeorm migration:run` | Runs TypeORM migrations — violates Knex-only rule |
| `npm run typeorm schema:sync` | Directly syncs schema from entities — catastrophic in prod |
| `DROP DATABASE` | Destructive — requires out-of-band DBA approval |
| `TRUNCATE TABLE ... CASCADE` | Cascade truncate in prod — forbidden |
| `mc rm --recursive` (staging/prod) | Mass object delete without approval |
| Writing to `dist/` | Build artifacts are generated — never hand-edited |
| Direct `pg` driver queries for DDL | Bypasses Knex migration system |
| Any ORM's `forceSchemaSync` | Same as `synchronize: true` |

---

## 5. TOOL USAGE PROTOCOL FOR AGENTS

1. Before invoking any destructive command (`rm`, `rollback`, `drop`), STATE the intent and await confirmation
2. Before running `npx knex migrate:latest` against any non-local environment, confirm the environment name
3. Before uploading to MinIO, validate the object key matches the naming convention in `instructions.md §6`
4. Before creating a new Knex migration, verify no pending migration covers the same schema change
5. All agent-generated code MUST compile (`npm run build`) before being considered complete

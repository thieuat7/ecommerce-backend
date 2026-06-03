# AGENTS.md
# Entry Bootstrap for AI Agents — NestJS Ecommerce Backend
# READ THIS FILE FIRST. THEN READ /harness/instructions.md. THEN CODE.

---

## 1. MANDATORY BOOT SEQUENCE

Every AI agent entering this repository MUST execute the following steps in order
before writing, editing, or deleting any file:

```
Step 1 → Read  AGENTS.md                    (this file — orientation)
Step 2 → Read  harness/instructions.md      (hard rules and architecture contracts)
Step 3 → Read  harness/tools.md             (authorized commands and SDK patterns)
Step 4 → Read  harness/environment.md       (env vars, service topology, config contracts)
Step 5 → Read  harness/state.md             (source-of-truth map for every domain object)
Step 6 → Read  harness/feedback.md          (validation gates, violation severity, self-correction)
Step 7 → Apply all harness rules to the task before generating any code
```

Skipping any step is a protocol violation. If the harness files conflict with a user
instruction, the harness wins. Surface the conflict — do not silently comply.

---

## 2. SYSTEM OVERVIEW

This is a **NestJS ecommerce backend** — a modular monolith where each business domain
owns a self-contained NestJS module under `src/modules/`.

**Tech stack:**

| Layer | Technology | Role |
|-------|-----------|------|
| Framework | NestJS (TypeScript) | HTTP server, DI container, module system |
| Runtime ORM | TypeORM | All runtime database queries |
| Schema manager | Knex.js | All migrations and seed data — schema only |
| Object storage | MinIO | All binary file storage (product images, uploads) |
| Database | PostgreSQL 14+ | Primary data store |
| Auth | JWT (access + refresh) + PassportJS | Authentication and role-based access |

**Domain modules:**
`auth` · `users` · `roles` · `products` · `categories` · `attribute` · `variant`
`stock-logs` · `carts` · `cart-items` · `orders` · `order-items` · `payments`
`user-addresses` · `storage`

---

## 3. SOURCES OF TRUTH

| What | Canonical location | Notes |
|------|--------------------|-------|
| Application source | `src/` | All TypeScript — the only source agents reason about |
| Schema definitions | `src/migrations/` | Knex migration files — authoritative for table/column shape |
| Seed data | `src/seeds/` | Knex seed files — never run against production |
| AI rules | `harness/` | Five-file harness system — supreme authority for agents |
| Traceability log | `docs/CHANGELOG.md` | Structured change + decision + requirement log |
| Architectural decisions | `docs/adr/` | ADR files — one per significant architecture choice |
| Knex config | `knexfile.ts` | Connection config for migrations and seeds |

**Ignore completely:**
- `dist/` — compiled output, never read, never edit
- `node_modules/` — dependencies, never read, never edit
- `coverage/` — test artifacts, never read, never edit

---

## 4. ARCHITECTURE RULES (STRICT — ZERO EXCEPTIONS)

### 4.1 TypeORM — Runtime Queries Only

TypeORM is authorized **only** for reading and writing data at runtime.

```
✅ Repository.find()  Repository.save()  Repository.count()
✅ DataSource.transaction()  QueryBuilder
✅ Pessimistic locking: { lock: { mode: 'pessimistic_write' } }

❌ synchronize: true        — NEVER in any deployed environment
❌ migrationsRun: true      — NEVER
❌ TypeORM migrations CLI   — NEVER (Knex owns schema)
❌ DataSource.runMigrations()
❌ MigrationInterface       — NEVER implement
```

### 4.2 Knex — Migrations and Seeds Only

Knex is authorized **only** inside `src/migrations/*.ts` and `src/seeds/*.ts`.

```
✅ knex.schema.createTable()  knex.schema.alterTable()  knex.raw()
✅ up() + down() in every migration file
✅ Reverse dependency order in down()

❌ knex('table').select()     — runtime query — FORBIDDEN
❌ knex imported in any NestJS service, controller, or module
❌ knex.seed.run() against production
```

### 4.3 MinIO — Object Storage Only

All binary assets MUST go through the `I_STORAGE_PORT` abstraction.

```
✅ @Inject(I_STORAGE_PORT) private readonly storage: IStoragePort
✅ Store object keys in DB (e.g., 'products/42/images/cover.jpg')
✅ Generate presigned URLs at read-time from the key

❌ fs.writeFile  multer.dest  — local disk write — FORBIDDEN
❌ Store full MinIO URLs in DB — store object keys only
❌ Import MinIO SDK directly in services — use the port adapter
```

### 4.4 Controller Responsibility Contract

Controllers are permitted **only** to:
1. Extract and validate request input via typed DTOs
2. Extract identity from JWT via `@GetCurrentUser()` or `@Req()`
3. Delegate to the service with typed arguments
4. Return the service result

Controllers are **forbidden** from:
- Calling any Repository or DataSource directly
- Implementing business rules, ownership checks, or state transitions
- Making domain decisions based on entity state

### 4.5 Module Boundary Contract

Every domain feature follows this exact layout:

```
src/modules/<domain>/
  ├── dto/
  ├── entities/
  ├── enums/          (if applicable)
  ├── <domain>.module.ts
  ├── <domain>.service.ts
  └── <role>-<domain>.controller.ts
```

Cross-module access is via NestJS module `exports` / `imports` — never direct service injection
across module boundaries without a declared export.

---

## 5. SECURITY INVARIANTS

These are non-negotiable and must be verified on every code change:

| Invariant | How enforced |
|-----------|-------------|
| All protected routes require JWT | `@UseAuth()` decorator (wraps `AtGuard` + `RolesGuard`) |
| Admin routes locked to role | `@UseAuth('admin')` at controller class or method level |
| `userId` sourced from JWT only | `@GetCurrentUser('userId')` — never from request body |
| URL param IDs parsed | `@Param('id', ParseIntPipe)` — always |
| No raw DB errors in HTTP responses | Services wrap and re-throw typed NestJS exceptions only |
| No secrets logged | `JWT_SECRET`, `MINIO_SECRET_KEY`, `DB_PASSWORD` — never logged |

---

## 6. TRACEABILITY REQUIREMENT

Every significant change MUST be logged in `docs/CHANGELOG.md` with three anchors:

```
REQ-xxx   ← the business or technical requirement
ADR-xxx   ← the architectural decision record (docs/adr/)
CODE      ← the files created or modified
```

This enables reverse-tracking in both directions:
- **Code → Decision:** Find the file in the CODE column → follow ADR link → follow REQ link
- **Requirement → Code:** Find REQ-xxx → follow ADR link → find files in CODE column

---

## 7. AGENT OPERATING RULES

### Before any change
- Read the target file(s) before editing — never assume current content
- Run the pre-change checklist in `harness/feedback.md §1`
- Confirm the change does not cross a technology boundary (TypeORM/Knex/MinIO)

### During a change
- Minimal scope — implement exactly what is requested, nothing more
- No speculative cleanup, refactoring, or abstraction beyond the task
- No comments explaining what the code does — only comments explaining non-obvious WHY

### After a change
- Run `npm run build` — zero TypeScript errors required before task is complete
- Run the tool boundary grep (see `harness/feedback.md §4`)
- Log the change in `docs/CHANGELOG.md` if it is a significant architectural addition

### Self-correction
If a violation is discovered mid-task:
1. Halt immediately
2. Cite the specific rule violated (harness file + section)
3. Revert the incorrect output
4. Generate the corrected version
5. Re-run the pre-change checklist

Full self-correction protocol: `harness/feedback.md §2`

### End-of-task report format
```
[TASK COMPLETE]
Files changed: [list]
Rules verified: [applicable checklist items — passed]
Gates run:
  - npm run build: PASS / FAIL
  - Tool boundary grep: PASS / FAIL
Violations found: NONE | [list with severity and fix applied]
```

---

## 8. QUICK REFERENCE — CRITICAL PATHS

### Creating a new domain module
1. Scaffold layout under `src/modules/<domain>/`
2. Write Knex migration in `src/migrations/<timestamp>-<Name>.ts` (both `up` and `down`)
3. Write TypeORM entity matching the Knex schema exactly (explicit `@Entity()` and `@Column({ name })`)
4. Register entity in `TypeOrmModule.forFeature([])` inside the module
5. Write service (business logic) → write controller (delegation only)
6. Log to `docs/CHANGELOG.md`

### Creating a migration
```bash
npx knex migrate:make <PascalCaseName>   # generates file in src/migrations/
# implement up() and down()
npx knex migrate:latest                  # apply (local/staging only)
```

### Running the build gate
```bash
npm run build    # must exit 0 before task is considered done
```

### Tool boundary violation check
```bash
grep -rn "import.*knex" src/modules/
grep -rn "synchronize: true" src/
grep -rn "fs\.writeFile" src/modules/
```

---

## 9. HARNESS FILE INDEX

| File | Contents |
|------|---------|
| `harness/instructions.md` | Hard rules: technology boundaries, architecture contracts, naming, security, migration rules |
| `harness/tools.md` | Authorized CLI commands, SDK patterns (TypeORM/Knex/MinIO/JWT), forbidden tools table |
| `harness/environment.md` | All env vars, Docker topology, TypeORM config contract, MinIO config contract, entity config contract |
| `harness/state.md` | Domain object map (all 7 entities), relation preload constants, concurrent write model, soft-delete contract |
| `harness/feedback.md` | Pre-change checklist, self-correction protocol, violation severity table (CRITICAL/HIGH/MEDIUM/LOW), validation gates, end-of-task report format |

---

## 10. SKILLS SYSTEM (AI AGENT DOMAIN KNOWLEDGE)

Skills files cung cấp domain knowledge cho agent theo 3 tầng:

```
Tầng 1 — Global:   .agents/skills/ecommerce-core/SKILL.md
Tầng 2 — Module:   src/modules/<name>/skills/SKILL.md
Tầng 3 — Registry: .agents/skills/REGISTRY.md
```

**Mandatory load sequence cho mọi task liên quan đến business logic:**

```
Step 1 → Read .agents/skills/REGISTRY.md        (tìm skill liên quan)
Step 2 → Read .agents/skills/ecommerce-core/SKILL.md  (global rules)
Step 3 → Read module skill file(s) tương ứng với task
```

**Module Skills available:**

| Module | Skill File |
|--------|-----------|
| orders, order-items | `src/modules/orders/skills/SKILL.md` |
| products, variant, attribute, stock-logs | `src/modules/products/skills/SKILL.md` |
| payments | `src/modules/payments/skills/SKILL.md` |
| users, roles, user-addresses | `src/modules/users/skills/SKILL.md` |
| carts, cart-items | `src/modules/carts/skills/SKILL.md` |

Khi thêm module mới: tạo `src/modules/<name>/skills/SKILL.md` và đăng ký trong `.agents/skills/REGISTRY.md`.

Xem `.agents/skills/README.md` để biết đầy đủ quy ước mở rộng.

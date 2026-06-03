# HARNESS :: ENVIRONMENT
# Authority: Staff Architect | Scope: All AI Agents | Version: 1.0.0

---

## 0. PURPOSE

Defines all runtime infrastructure assumptions, environment variables, service topology,
and configuration contracts that agents MUST respect when generating or modifying code.

---

## 1. RUNTIME ENVIRONMENTS

| Name | Description | DB Migrations | Seeds | MinIO bucket |
|------|-------------|---------------|-------|--------------|
| `local` | Developer workstation | Auto on startup (knex) | Manual opt-in | `ecommerce-local` |
| `staging` | Pre-prod validation | Manual approval required | Admin only | `ecommerce-staging` |
| `production` | Live system | DBA-approved only | FORBIDDEN | `ecommerce-prod` |

**Rule:** Code MUST NOT hardcode environment-specific values. All environment-specific config
is injected via process environment variables consumed through `ConfigService`.

---

## 2. REQUIRED ENVIRONMENT VARIABLES

All variables below MUST exist for the application to boot.
Any agent generating configuration code MUST reference these exact key names.

### 2.1 Database (PostgreSQL via TypeORM)

| Variable | Type | Example | Notes |
|----------|------|---------|-------|
| `DB_HOST` | string | `ecommerce_postgres` | Docker service name or host |
| `DB_PORT` | number | `5432` | Default PostgreSQL port |
| `DB_USER` | string | `postgres` | DB username |
| `DB_PASSWORD` | string | `postgres123` | Never commit real values |
| `DB_NAME` | string | `ecommerce_db` | Target database name |

### 2.2 Knex (reads same DB vars — uses same connection)

Knex shares DB connection variables with TypeORM.
See `knexfile.ts` — reads `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

### 2.3 MinIO Object Storage

| Variable | Type | Example | Notes |
|----------|------|---------|-------|
| `MINIO_ENDPOINT` | string | `localhost` | MinIO server host |
| `MINIO_PORT` | number | `9000` | MinIO API port |
| `MINIO_ACCESS_KEY` | string | `minioadmin` | Root access key |
| `MINIO_SECRET_KEY` | string | `minioadmin123` | Root secret — never log |
| `MINIO_BUCKET` | string | `ecommerce-local` | Target bucket name |
| `MINIO_USE_SSL` | boolean | `false` | TLS toggle (true in prod) |

### 2.4 Application

| Variable | Type | Example | Notes |
|----------|------|---------|-------|
| `APP_PORT` | number | `3000` | NestJS HTTP listen port |
| `NODE_ENV` | string | `development` | `development`, `staging`, `production` |
| `JWT_SECRET` | string | `...` | HS256 signing secret — never commit |
| `JWT_EXPIRATION` | string | `7d` | Access token lifetime |
| `JWT_REFRESH_SECRET` | string | `...` | Refresh token secret |
| `JWT_REFRESH_EXPIRATION` | string | `30d` | Refresh token lifetime |

**Rule:** Any new module that needs environment config MUST add its variables to this section
AND register them in the NestJS `ConfigModule.forRoot({ validationSchema })` if schema validation exists.

---

## 3. SERVICE TOPOLOGY

### 3.1 Local Docker Compose Stack

```
┌─────────────────────────────────────────┐
│           docker-compose.yml             │
│                                          │
│  ┌─────────────┐   ┌──────────────────┐ │
│  │  ecommerce  │   │ ecommerce_minio   │ │
│  │  _postgres  │   │                  │ │
│  │  :5432      │   │  API :9000       │ │
│  └──────┬──────┘   │  Console :9001   │ │
│         │          └────────┬─────────┘ │
│  ┌──────┴──────────────────┴─────────┐  │
│  │         NestJS App :3000           │  │
│  │  TypeORM ──► PostgreSQL            │  │
│  │  MinioStorageAdapter ──► MinIO     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 3.2 Network Rules

- NestJS connects to PostgreSQL via `DB_HOST` (Docker network hostname in container, `localhost` on host)
- NestJS connects to MinIO via `MINIO_ENDPOINT` (Docker network hostname in container, `localhost` on host)
- MinIO console is exposed on port `9001` for local admin
- No direct internet egress is required by any service in the current scope

---

## 4. TYPEORM CONFIGURATION CONTRACT

TypeORM MUST be configured via `TypeOrmModule.forRootAsync()` using `ConfigService`.
The agent-generated config MUST match this schema exactly:

```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('DB_HOST'),
    port: config.get<number>('DB_PORT'),
    username: config.get<string>('DB_USER'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_NAME'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    // ─── INVARIANTS ────────────────────────────────────────────────
    synchronize: false,           // NEVER true in any deployed env
    migrationsRun: false,         // NEVER true — Knex owns migrations
    migrations: [],               // ALWAYS empty — Knex owns schema
    // ─── OPTIONAL (local dev only) ─────────────────────────────────
    logging: config.get('NODE_ENV') !== 'production',
  }),
  inject: [ConfigService],
})
```

**Violation:** Any agent that sets `synchronize: true` or `migrationsRun: true` in a deployed
environment has violated the hard boundary between TypeORM (runtime) and Knex (schema).

---

## 5. MINIO CONFIGURATION CONTRACT

The `MinioStorageAdapter` MUST read all config from `ConfigService`.
The following invariant checks MUST be present in the adapter's `onModuleInit()`:

```typescript
async onModuleInit() {
  const bucketName = this.config.get<string>('MINIO_BUCKET')
  const exists = await this.client.bucketExists(bucketName)
  if (!exists) {
    await this.client.makeBucket(bucketName, 'us-east-1')
  }
}
```

**Rule:** The adapter MUST ensure the bucket exists on startup.
Bucket creation is idempotent and safe to call every boot.

---

## 6. ENTITY CONFIGURATION CONTRACT

Every TypeORM entity MUST follow this pattern:

```typescript
@Entity('table_name')           // explicit table name — never rely on auto-naming
export class MyEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'field_name' })  // explicit column name — matches Knex migration
  fieldName: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
```

**Rules:**
- ALWAYS specify `@Entity('exact_table_name')` — matches the Knex migration `createTable` call
- ALWAYS use `name:` option on `@Column()` to match the `snake_case` DB column name
- Relation columns MUST match the FK defined in the Knex migration exactly
- If the Knex migration adds a `deleted_at` column, the entity MUST have a `@DeleteDateColumn` or `@Column({ nullable: true })` named `deletedAt`

---

## 7. POSTGRES VERSION AND FEATURE CONTRACT

- PostgreSQL version: **14+** (ENUM types, CHECK constraints, and `FOR UPDATE` locks required)
- ENUM types MUST be created with `knex.raw()` — `knex.schema` does not support PostgreSQL ENUM natively
- All timestamps are stored as `TIMESTAMP WITH TIME ZONE` (default for `table.timestamps(true, true)`)
- Decimal money values use `DECIMAL(14, 2)` — never `FLOAT` (floating-point rounding in money is a bug)
- All text search (future) MUST use PostgreSQL's `tsvector` — no Elasticsearch in current scope

---

## 8. BUILD AND COMPILATION CONTRACT

- TypeScript compiler target: `ES2020` (check `tsconfig.json`)
- Path aliases: `@modules/*` → `src/modules/*` (registered in `tsconfig.json` and `tsconfig-paths`)
- Build output: `dist/` — never commit, never hand-edit
- All new files MUST compile with zero TypeScript errors before being considered complete
- `npm run build` is the acceptance gate — agents MUST run it before marking a task done

---

## 9. ENVIRONMENT FAILURE MODES AND AGENT RESPONSE

| Failure | Symptom | Agent Action |
|---------|---------|--------------|
| DB not reachable | `ECONNREFUSED 5432` | Report; do not attempt code fixes |
| MinIO not reachable | Bucket op throws | Report; check `MINIO_ENDPOINT` and Docker stack |
| Migration pending | TypeORM query returns wrong schema | Run `npx knex migrate:status`, surface to operator |
| Missing env var | `ConfigService.get()` returns `undefined` | Do not proceed; report the missing variable by name |
| `synchronize: true` found | Entities may auto-alter tables on boot | Flag as CRITICAL violation; revert immediately |

---

## 10. SECRETS HANDLING RULES

- NEVER commit `.env` files containing real credentials to git
- NEVER log values from `JWT_SECRET`, `MINIO_SECRET_KEY`, `DB_PASSWORD`
- NEVER echo secrets in error messages returned to HTTP clients
- Use `.env.example` with placeholder values as the committed reference
- In CI, secrets MUST be injected via environment variable mechanism (GitHub Secrets, etc.)

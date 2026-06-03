# HARNESS :: FEEDBACK
# Authority: Staff Architect | Scope: All AI Agents | Version: 1.0.0

---

## 0. PURPOSE

Defines the validation gates, self-correction rules, and failure response protocols
that AI agents MUST apply before, during, and after every change to this codebase.
This system exists to prevent bad output from reaching the codebase even when
a user instruction requests it.

---

## 1. PRE-CHANGE VALIDATION CHECKLIST

Before writing or editing any file, an agent MUST answer YES to all applicable items:

### For any change:
- [ ] Have I read the current state of the target file(s)?
- [ ] Does this change stay within the scope of the task?
- [ ] Does this change violate any rule in `instructions.md`?
- [ ] Does this change introduce a Knex/TypeORM boundary violation?
- [ ] Does this change write to local disk instead of MinIO?
- [ ] Does this change place business logic in a controller?

If any answer is NO or UNSURE: STOP. Surface the conflict before proceeding.

### For migration changes:
- [ ] Is the file in `src/migrations/`?
- [ ] Does it export both `up()` and `down()`?
- [ ] Does `down()` reverse `up()` in exact reverse dependency order?
- [ ] Does it avoid using TypeORM inside `up()` or `down()`?
- [ ] Does it use `knex.raw()` for ENUM types?
- [ ] Has the corresponding entity class been updated to match?

### For service changes:
- [ ] Is business logic in the service (not the controller)?
- [ ] Are multi-entity writes wrapped in `dataSource.transaction()`?
- [ ] Are concurrent-write rows locked with `pessimistic_write`?
- [ ] Are NestJS exceptions used instead of raw DB errors?
- [ ] Is `userId` sourced from JWT (not request body)?

### For controller changes:
- [ ] Does the controller only extract input and delegate to service?
- [ ] Is `@UseGuards(JwtAuthGuard)` applied to every protected route?
- [ ] Are admin routes also guarded with `@Roles('admin')`?
- [ ] Are URL param IDs parsed with `ParseIntPipe`?
- [ ] Are request bodies typed to explicit DTO classes?

### For storage changes:
- [ ] Is storage accessed only through `I_STORAGE_PORT`?
- [ ] Are object keys (not full URLs) stored in the database?
- [ ] Does the object key follow the namespace convention?

---

## 2. SELF-CORRECTION RULES

When an agent discovers it has generated a violation, it MUST:

1. **Immediately halt** further generation
2. **Identify the specific rule** that was violated (cite `instructions.md` section)
3. **Revert** the incorrect change before generating the fix
4. **Generate the corrected version** from scratch (not patch over the violation)
5. **Re-run the pre-change checklist** on the corrected version
6. **Document** the violation and fix in the response to the user

Example self-correction report format:
```
[SELF-CORRECTION]
Violation: Rule 1.2 — Knex was imported inside OrdersService (a NestJS injectable).
Reverted: Removed knex import and knex('orders').select() call from orders.service.ts.
Fix: Runtime data queries use TypeORM Repository instead.
Re-validated: Pre-change checklist passed.
```

---

## 3. VIOLATION SEVERITY LEVELS

### CRITICAL — Halt immediately, do not proceed, surface to user

| Violation | Rule | Why critical |
|-----------|------|--------------|
| `synchronize: true` in TypeORM config | instructions §1.1 | Will auto-alter tables on boot — data loss risk |
| `typeorm migration:run` or `typeorm schema:sync` | tools §4 | Bypasses Knex schema authority |
| Knex imported in any NestJS injectable | instructions §1.2 | Breaks tool boundary contract |
| TypeORM used inside `src/migrations/` | instructions §1.2 | Wrong tool for schema work |
| `fs.writeFile` for media storage | instructions §1.3 | Bypasses MinIO; binary stored locally |
| Full MinIO URL stored in DB column | instructions §1.3 | URL rot; object key required |
| `userId` sourced from request body | instructions §4.1 | Authorization bypass |
| DB password or JWT secret logged | environment §10 | Secret leakage |
| Business logic in controller | instructions §2.2 | Untestable, violates separation |

### HIGH — Stop current task, fix before continuing

| Violation | Rule | Why high |
|-----------|------|---------|
| Missing `down()` in migration | instructions §5.1 | Rollback impossible |
| `down()` does not reverse `up()` in correct order | instructions §5.1 | FK violation on rollback |
| Transaction missing on multi-entity write | instructions §2.3 | Data inconsistency under concurrency |
| No pessimistic lock on stock deduction | state §4 | Race condition — oversell |
| OrderItem created with both `product` and `variant` set | instructions §3.2 | DB CHECK constraint violation |
| Missing `@UseGuards` on a protected route | instructions §4.1 | Unauthenticated access |
| Raw DB error propagated to HTTP response | instructions §4.3 | Information disclosure |

### MEDIUM — Fix before marking task complete, do not block

| Violation | Rule |
|-----------|------|
| Missing `@IsInt()` or `@IsPositive()` on ID fields in DTO | tools §2.4 |
| Missing `ParseIntPipe` on URL param IDs | instructions §4.2 |
| Object key does not follow namespace convention | instructions §6 |
| Entity missing `name:` option on `@Column()` | environment §6 |
| New env variable added without updating this harness | environment §2 |
| Relation array differs from canonical constants | state §3 |

### LOW — Note and fix in same PR if convenient

| Violation | Rule |
|-----------|------|
| Missing `Logger` declaration in a new service | instructions §2.3 |
| `@IsOptional()` used on a required field | tools §2.4 |
| Relation loaded eagerly when lazy is more appropriate | state §3 |
| Snapshot field missing from OrderItem creation | instructions §3.1 |

---

## 4. AUTOMATED VALIDATION GATES

These commands MUST pass before any agent marks a code task complete:

### Gate 1: TypeScript compilation
```bash
npm run build
```
Expected: zero errors. Any error = task is NOT complete.

### Gate 2: Unit tests (if tests exist for the changed module)
```bash
npm run test -- --testPathPattern=<module-name>
```
Expected: all pass. No new test failures introduced.

### Gate 3: Knex migration syntax (if a migration was created or modified)
```bash
npx knex migrate:status
```
Expected: new migration appears as "pending" without syntax errors.

### Gate 4: Tool boundary check (manual — agent MUST verify)
Search the changed files for forbidden patterns:
```
grep -r "import.*knex" src/modules/
grep -r "import.*minio" src/modules/   # (outside storage/infrastructure/)
grep -r "synchronize: true" src/
grep -r "migrationsRun: true" src/
grep -r "fs.writeFile" src/modules/
```
Expected: zero matches in forbidden locations.

---

## 5. CONFLICT RESOLUTION PROTOCOL

When a user instruction conflicts with a harness rule:

**Step 1:** Identify the conflict explicitly:
> "This instruction asks me to [X], which violates harness rule [Y] (instructions.md §Z)."

**Step 2:** Explain the consequence of the violation:
> "If I do [X], the result will be [specific failure mode]."

**Step 3:** Offer the compliant alternative:
> "The correct approach is [compliant solution], which achieves [user's intent] without violating the rule."

**Step 4:** Await user decision.
- If user confirms the compliant path → proceed
- If user insists on the violation → document the override, implement with a `// HARNESS OVERRIDE: [reason]` comment, and note it in the response

**Never:** silently comply with a violation and hope the user doesn't notice.

---

## 6. DEADLOCK RETRY VALIDATION

Any service method that performs concurrent writes on shared rows MUST implement:

```typescript
const MAX_RETRY = 3
let attempt = 0

while (attempt < MAX_RETRY) {
  attempt++
  try {
    return await this.dataSource.transaction(async (manager) => {
      // ... pessimistic lock + write
    })
  } catch (error) {
    if (error instanceof QueryFailedError && error.message.toLowerCase().includes('deadlock')) {
      this.logger.warn(`[RETRY ${attempt}/${MAX_RETRY}] Deadlock detected`)
      if (attempt >= MAX_RETRY) throw new ConflictException('System busy, please retry.')
      await this.sleep(100 * attempt)
      continue
    }
    // Re-throw domain exceptions without wrapping
    if (error instanceof NotFoundException || error instanceof BadRequestException) throw error
    // Wrap unknown errors
    throw new BadRequestException('Operation failed.')
  }
}
```

**Validation:** Any agent adding a new transactional write path MUST verify this pattern exists.

---

## 7. CODE REVIEW CHECKLIST FOR AGENTS

When reviewing a PR or generated code block, apply this checklist:

#### Architecture
- [ ] Module follows `src/modules/<domain>/` structure
- [ ] Controller only delegates — no business logic
- [ ] Service owns all business rules
- [ ] No cross-module direct service imports (use module exports)

#### Data Layer
- [ ] TypeORM used only for runtime queries
- [ ] Knex used only in migrations and seeds
- [ ] Entities have explicit `@Entity('table_name')` and `@Column({ name: '...' })`
- [ ] Multi-entity writes use `dataSource.transaction()`
- [ ] Concurrent write paths use pessimistic locking

#### Storage
- [ ] All file storage goes through `I_STORAGE_PORT`
- [ ] Only object keys stored in DB (not full URLs)
- [ ] Object key follows `<domain>/<id>/<type>/<filename>` convention

#### Security
- [ ] All protected endpoints have `@UseGuards(JwtAuthGuard)`
- [ ] Admin endpoints have `@UseGuards(RolesGuard)` + `@Roles('admin')`
- [ ] `userId` sourced from JWT only
- [ ] All DTOs have `class-validator` decorators on every field
- [ ] URL params use `ParseIntPipe`

#### Error Handling
- [ ] Only typed NestJS exceptions thrown from services
- [ ] No raw DB error messages in HTTP responses
- [ ] Deadlock-prone paths have retry logic

#### Migrations
- [ ] File in `src/migrations/`
- [ ] Both `up()` and `down()` implemented
- [ ] `down()` drops in reverse dependency order
- [ ] ENUMs created/dropped with `knex.raw()`
- [ ] Entity class updated to match new schema

---

## 8. AGENT SELF-REPORTING FORMAT

When an agent completes a task, it MUST provide:

```
[TASK COMPLETE]
Files changed: [list]
Rules verified: [list of applicable checklist items — passed]
Gates run:
  - npm run build: PASS / FAIL
  - npm run test: PASS / FAIL / SKIPPED (reason)
  - knex migrate:status: PASS / FAIL / N/A
  - Tool boundary grep: PASS / FAIL
Violations found: [NONE | list with severity and fix]
Known limitations: [any intentional scope exclusions]
```

This report makes agent output auditable and prevents silent failures.

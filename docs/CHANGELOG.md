# STRUCTURED CHANGELOG
# Ecommerce Backend — NestJS
# Format: reverse-chronological | each entry links CODE ↔ DECISION ↔ REQUIREMENT

---

## How to Read This File

Each entry carries three traceability anchors:

| Anchor | Meaning |
|--------|---------|
| `REQ-xxx` | Business or technical requirement driving the change |
| `ADR-xxx` | Architectural Decision Record explaining *how* it was solved |
| `CODE` | Files created or modified |

**Reverse-trace paths:**
- `code file` → search `CODE` column → find `ADR-xxx` → find `REQ-xxx`
- `requirement` → search `REQ-xxx` → find `ADR-xxx` → find `CODE`

---

## [2026-06-02] — Admin Product Reporting Module

### Summary
Introduced a dedicated admin reporting layer for the products domain.
Adds two endpoints under `GET /admin/products/summary` and `GET /admin/products/stats`.

### Requirement
`REQ-PROD-001` — Admins require a consolidated view of product catalog health
(total inventory counts, active vs inactive breakdown, soft-deleted count)
without commingling analytics queries with the existing CRUD service.

### Decision
`ADR-001` — See `docs/adr/ADR-001-admin-product-reporting.md`

### Files Changed

| Operation | File | Role |
|-----------|------|------|
| CREATED | `src/modules/products/product-report.service.ts` | Analytics business logic |
| CREATED | `src/modules/products/admin-products.controller.ts` | HTTP layer for `/admin/products` |
| UPDATED | `src/modules/products/products.module.ts` | Registered new controller + service |
| CREATED | `docs/adr/ADR-001-admin-product-reporting.md` | Architectural decision record |
| CREATED | `docs/CHANGELOG.md` | This traceability log |

### Endpoints Added

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/admin/products/summary` | JWT + Role:admin | Product catalog health summary |
| GET | `/admin/products/stats` | JWT + Role:admin | Stats stub — reserved for future analytics |

### Interfaces Exported

```typescript
// From product-report.service.ts
ProductSummary { totalProducts, activeProducts, inactiveProducts, deletedProducts }
ProductStats   { message, availableMetrics }
```

### Harness Compliance

| Rule | Status |
|------|--------|
| Business logic in service, not controller | PASS |
| TypeORM Repository only (no Knex runtime) | PASS |
| No raw SQL (count queries use Repository.count()) | PASS |
| Admin route guarded with @UseAuth('admin') | PASS |
| No local file storage touched | N/A |
| TypeScript compilation gate | PASS |

---

<!-- TEMPLATE FOR FUTURE ENTRIES

## [YYYY-MM-DD] — <Short Title>

### Summary
<1-2 sentences>

### Requirement
`REQ-XXX-NNN` — <description of the business/technical need>

### Decision
`ADR-NNN` — See `docs/adr/ADR-NNN-<slug>.md`

### Files Changed

| Operation | File | Role |
|-----------|------|------|
| CREATED/UPDATED/DELETED | `path/to/file.ts` | <role> |

### Harness Compliance

| Rule | Status |
|------|--------|
| ... | PASS/FAIL/N/A |

-->

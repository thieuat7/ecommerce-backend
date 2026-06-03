# ADR-001 — Admin Product Reporting Layer
**Date:** 2026-06-02
**Status:** Accepted
**Deciders:** Staff Architect (AI Harness)
**Requirement:** `REQ-PROD-001`

---

## Context

The `ProductsService` handles all CRUD operations for the products domain.
As the admin panel grows, it will require analytics and reporting queries
(counts, trends, low-stock alerts, revenue breakdowns) that:

1. Are **read-heavy and aggregative** — different query shape from CRUD.
2. Would **pollute `ProductsService`** if added inline, violating single-responsibility.
3. May later need **independent caching, rate-limiting, or access control** separate from CRUD.
4. Are scoped to **admin users only** — the existing `ProductsController` also serves public endpoints.

The existing `ProductsController` mixes public and admin routes, handled via `@UseAuth('admin')`
per method. A dedicated admin controller keeps the separation explicit at the routing layer.

---

## Decision

**Create a separate `ProductReportService`** to own all analytics/reporting queries,
registered alongside `ProductsService` in `ProductsModule`.

**Create a separate `AdminProductsController`** at route prefix `/admin/products`
that is entirely guarded at the class level with `@UseAuth('admin')`.

**Do NOT modify `ProductsService`** or `ProductsController` — the change is additive only.

---

## Architecture

```
ProductsModule
│
├── ProductsController        (/products)          — public + admin CRUD
│     └── ProductsService     [existing]
│
└── AdminProductsController   (/admin/products)    ← NEW — admin reporting only
      └── ProductReportService                     ← NEW — analytics logic
```

**Data access:** `ProductReportService` receives its own `@InjectRepository(Product)`
injection. It does NOT call `ProductsService` — this avoids coupling the analytics
path to CRUD service internals that may change independently.

---

## Endpoints

| Route | Response type | Logic |
|-------|--------------|-------|
| `GET /admin/products/summary` | `ProductSummary` | 3 parallel `Repository.count()` calls |
| `GET /admin/products/stats` | `ProductStats` | Synchronous stub — zero DB calls |

**`ProductSummary` shape:**
```typescript
{
  totalProducts: number;    // non-deleted (TypeORM @DeleteDateColumn auto-filters)
  activeProducts: number;   // isActive=true AND non-deleted
  inactiveProducts: number; // computed: total - active
  deletedProducts: number;  // withDeleted:true WHERE deletedAt IS NOT NULL
}
```

---

## Alternatives Considered

### Alt A: Add methods directly to `ProductsService`
- **Rejected.** Violates single-responsibility. Analytics query shape differs from CRUD.
  Aggregation queries that join or count across large datasets should not block CRUD paths.

### Alt B: Create a separate `ProductAnalyticsModule`
- **Rejected for now.** Premature extraction. The report service only needs `Product` repository,
  which is already available in `ProductsModule`. A separate module would require cross-module
  entity exports and adds boilerplate with no benefit at this scale.
  **Re-evaluate if:** the analytics surface grows beyond 5 endpoints, or needs its own DB
  read replica, cache layer, or rate limiter.

### Alt C: Use raw SQL via `DataSource.query()`
- **Rejected.** `Repository.count()` with TypeORM options is sufficient and maintains
  the harness rule of TypeORM-only for runtime data access. Raw SQL is the escalation
  path only when ORM cannot express the query.

---

## Consequences

**Positive:**
- Clear separation: CRUD logic in `ProductsService`, analytics in `ProductReportService`
- Admin routing is explicit — `/admin/products/*` is entirely class-guarded
- `ProductsService` and `ProductsController` are untouched (zero regression risk)
- `ProductReportService.getStats()` stub establishes the extension point for future analytics

**Negative / Trade-offs:**
- Two services now hold a `Repository<Product>` injection — acceptable at this scale;
  becomes a concern only if write-heavy cross-service coordination is needed
- `getStats()` is a stub — must be replaced with real implementation before being user-visible
  in production admin panel

---

## Compliance with Harness Rules

| Rule | Compliance |
|------|-----------|
| `instructions.md §2.1` — One module per domain | PASS — no new module; reporting is a service within `ProductsModule` |
| `instructions.md §2.2` — No business logic in controller | PASS — controller only delegates to `ProductReportService` |
| `instructions.md §1.1` — TypeORM for runtime only | PASS — `Repository.count()` only |
| `instructions.md §1.2` — Knex for schema only | PASS — no Knex touched |
| `instructions.md §4.1` — Admin endpoints guarded | PASS — `@UseAuth('admin')` at class level |
| `harness/feedback.md §2` — Self-correction | N/A — no violations detected |

---

## Reverse-Traceability Index

| Artifact | Points to |
|----------|-----------|
| `src/modules/products/admin-products.controller.ts` | ADR-001 → REQ-PROD-001 |
| `src/modules/products/product-report.service.ts` | ADR-001 → REQ-PROD-001 |
| `src/modules/products/products.module.ts` (controllers/providers arrays) | ADR-001 |
| `docs/CHANGELOG.md` entry 2026-06-02 | ADR-001 → REQ-PROD-001 |

---

## Future Expansion Path

When `GET /admin/products/stats` needs real data, implement inside `ProductReportService`:

```typescript
// Suggested next implementations (no schema changes required):
async getTopSellingProducts(limit = 10)     // join order_items → product_variants → products
async getLowStockVariants(threshold = 5)    // count on product_variants.stock_quantity
async getProductCreationTrend(days = 30)    // group-by createdAt (use QueryBuilder)
async getRevenueByCategory()               // join order_items + product_categories
```

These require only `QueryBuilder` calls — no Knex migrations, no entity changes.

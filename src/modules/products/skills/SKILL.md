# SKILL: Products Module

version: 1.0.0
scope: module
module: products
depends-on: [ecommerce-core, variant, attribute, stock-logs, storage, categories]
triggers: ["product", "sản phẩm", "variant", "biến thể", "stock", "tồn kho", "image", "ảnh sản phẩm", "slug", "category", "attribute"]

---

## When to Use

Load skill này khi:
- Tạo/sửa/đọc product và variants
- Upload ảnh sản phẩm
- Quản lý tồn kho (stock)
- Tìm kiếm/filter sản phẩm
- Liên quan đến attribute và attribute values
- Generate slug từ tên sản phẩm

---

## Module Responsibilities

- CRUD product catalog
- Quản lý product variants (size, color, ...)
- Upload và quản lý thứ tự ảnh sản phẩm lên MinIO
- Track tồn kho qua StockLog
- Generate SEO-friendly slug
- Filter, search, pagination sản phẩm

---

## Key Files

```
src/modules/products/
├── entities/
│   ├── product.entity.ts            Product aggregate root
│   ├── product-image.entity.ts      Ordered images
│   └── product-attribute.entity.ts  M2M product ↔ attribute
├── dto/
│   ├── create-product.dto.ts
│   ├── create-product-with-variants.dto.ts  Full creation payload
│   ├── update-product.dto.ts
│   ├── filter-product.dto.ts
│   └── product-image.dto.ts
├── products.service.ts
├── products.controller.ts            Public endpoints
├── admin-products.controller.ts      Admin endpoints
├── product-report.service.ts         Analytics/reporting
└── products.module.ts
```

---

## Data Model

```typescript
Product {
  id: number
  name: string
  slug: string         // unique, auto-generated from name
  description: string
  basePrice: number    // decimal(14,2) — giá gốc
  categoryId: number   // FK → categories
  isActive: boolean    // soft publish/unpublish
  createdAt / updatedAt / deletedAt
}

ProductImage {
  id: number
  productId: number
  url: string          // MinIO presigned or public URL
  order: number        // display order (0-indexed)
  isMain: boolean      // ảnh đại diện
}

ProductVariant {        // từ variant module
  id: number
  productId: number
  sku: string          // unique
  price: number        // decimal(14,2)
  stock: number        // current inventory
  createdAt / updatedAt
}

ProductVariantOption {  // từ variant module
  variantId: number
  attributeValueId: number
  // e.g. Size=L, Color=Red
}
```

---

## Business Rules

### R1: Slug Generation
```typescript
import slugify from 'slugify';
// Tự động sinh từ name, unique trong DB
const slug = slugify(name, { lower: true, strict: true });
// Nếu conflict: append hash 6 ký tự
const hash = createHash('md5').update(name).digest('hex').slice(0, 6);
const uniqueSlug = `${slug}-${hash}`;
```

### R2: Image Upload Flow
```
1. Nhận file qua multipart/form-data
2. Generate unique filename: `products/${productId}/${uuid}.${ext}`
3. Upload lên MinIO qua IStoragePort
4. Lưu URL vào ProductImage
5. Tự động set isMain = true nếu là ảnh đầu tiên
```

### R3: Stock Management
- Không cập nhật `variant.stock` trực tiếp nếu không qua StockLog
- Mọi thay đổi stock phải kèm log:
```typescript
// Khi tạo variant
await stockLogRepo.save({
  variantId, productId,
  action: StockLogAction.INITIAL,
  quantity: initialStock,
  note: 'Initial stock on creation',
});
```
- Actions: `INITIAL | IMPORT | SALE | RETURN | ADJUSTMENT`

### R4: Variant Creation Rule
Khi tạo product với variants:
```
1. Tạo Product trước (lấy productId)
2. Với mỗi variant:
   a. Tạo ProductVariant
   b. Với mỗi option (size, color): tạo ProductVariantOption → AttributeValue
   c. Tạo StockLog với action=INITIAL
3. Dùng transaction cho toàn bộ
```

### R5: Filter/Search
```typescript
// FilterProductDto fields:
categoryId?: number
minPrice?: number
maxPrice?: number
isActive?: boolean
search?: string    // fulltext trên name, description
page?: number
limit?: number
```
QueryBuilder pattern cho complex filter:
```typescript
const qb = this.productRepo.createQueryBuilder('p')
  .leftJoinAndSelect('p.images', 'img')
  .where('p.deletedAt IS NULL');
if (filter.categoryId) qb.andWhere('p.categoryId = :cid', { cid: filter.categoryId });
if (filter.search) qb.andWhere('p.name ILIKE :s', { s: `%${filter.search}%` });
```

---

## Common Workflows

### Workflow 1: Create Product with Variants (atomic)

```typescript
// Trong một transaction:
await dataSource.transaction(async (manager) => {
  // 1. Tạo product
  const product = await manager.save(Product, { name, slug, categoryId, ... });

  // 2. Upload images (ngoài transaction — MinIO external)
  const imageUrls = await this.storagePort.uploadMany(files);
  await manager.save(ProductImage, imageUrls.map((url, i) => ({
    productId: product.id, url, order: i, isMain: i === 0
  })));

  // 3. Tạo variants + options + stock logs
  for (const variantDto of variants) {
    const variant = await manager.save(ProductVariant, { productId: product.id, ...variantDto });
    await manager.save(ProductVariantOption, variantDto.options.map(opt => ({
      variantId: variant.id, attributeValueId: opt.attributeValueId
    })));
    await manager.save(StockLog, {
      variantId: variant.id, productId: product.id,
      action: StockLogAction.INITIAL, quantity: variantDto.stock
    });
  }
});
```

### Workflow 2: Update Image Order

```
1. Nhận array: [{ imageId, newOrder }]
2. Validate tất cả imageId thuộc productId này
3. Bulk update order field
4. Re-assign isMain = (order === 0)
```

### Workflow 3: Admin Product Report

```
Sử dụng product-report.service.ts:
- Top selling products (join với order_items)
- Low stock variants (stock < threshold)
- Revenue by category
```

---

## API Endpoints

### Public (products.controller.ts)
```
GET /products          List with filter/pagination
GET /products/:slug    Chi tiết product by slug
```

### Admin (admin-products.controller.ts)
```
POST   /admin/products                    Tạo product + variants
GET    /admin/products                    List (includes inactive)
GET    /admin/products/:id                Chi tiết by ID
PATCH  /admin/products/:id                Cập nhật product info
DELETE /admin/products/:id                Soft delete
POST   /admin/products/:id/images         Upload ảnh
PATCH  /admin/products/:id/images/order   Cập nhật thứ tự ảnh
DELETE /admin/products/:id/images/:imgId  Xóa ảnh
GET    /admin/products/reports            Analytics
```

---

## Storage Integration

```typescript
// Inject qua token, không inject adapter trực tiếp
@Inject(I_STORAGE_PORT)
private readonly storagePort: IStoragePort;

// Upload
const url = await this.storagePort.upload(file, path);
// Delete
await this.storagePort.delete(filePath);
```

---

## Anti-patterns

| Sai | Đúng |
|---|---|
| Thay đổi stock trực tiếp không qua StockLog | Luôn tạo StockLog kèm theo |
| Hardcode `isMain = true` cho ảnh bất kỳ | isMain chỉ đúng với image có `order === 0` |
| Inject MinioStorageAdapter trực tiếp | Inject qua `I_STORAGE_PORT` token |
| Slug tự generate phía client | Server sinh slug từ name + hash |
| Load product không có images relation | Luôn join images khi trả về product detail |
| Search bằng `LIKE '%x%'` trên toàn bảng | Dùng index hoặc full-text search |
| Tạo variant ngoài transaction | Toàn bộ product creation trong 1 transaction |

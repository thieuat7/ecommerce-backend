# Fix: `@typescript-eslint/no-unsafe-return` in `product_variant.entity.ts`

## Vấn đề

ESLint báo lỗi tại relation `@OneToMany(() => ProductVariantOption, (option) => option.variant)` vì tham số `option` bị suy luận là kiểu không an toàn, nên biểu thức `option.variant` bị xem là giá trị `any` trả về.

## Cách đã sửa

Đã đổi relation sang metadata dạng chuỗi của TypeORM để không còn callback trả về constructor:

```ts
@OneToMany('ProductVariantOption', 'variant')
options: ProductVariantOption[];
```

## Vì sao hết lỗi

Khi không dùng callback function nữa, ESLint không còn kiểm tra phần trả về của lambda và không phát sinh cảnh báo `@typescript-eslint/no-unsafe-return` trên relation này.

## Kiểm tra

Chạy lại lint hoặc mở file trong VS Code để xác nhận lỗi ESLint ở dòng relation đã biến mất.
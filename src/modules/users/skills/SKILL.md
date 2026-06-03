# SKILL: Users Module

version: 1.0.0
scope: module
module: users
depends-on: [ecommerce-core, roles, auth]
triggers: ["user", "người dùng", "profile", "role", "permission", "address", "user address"]

---

## When to Use

Load skill này khi:
- Quản lý thông tin user profile
- Gán/thu hồi roles
- Liên quan đến user-addresses
- Xác thực ownership (user X có sở hữu resource Y không)

---

## Module Responsibilities

- CRUD user profile (admin)
- User tự cập nhật profile của mình
- Gán role cho user
- Quan hệ với UserAddress, Order, Cart

---

## Data Model

```typescript
User {
  id: number
  email: string        // unique
  password: string     // bcrypt hash — KHÔNG expose ra response
  name: string
  phone: string | null
  avatarUrl: string | null
  isActive: boolean
  roleId: number       // FK → roles
  refreshToken: string | null   // lưu hash của RT
  createdAt / updatedAt / deletedAt
}
```

---

## Business Rules

### R1: Password Handling
```typescript
// Không bao giờ return password field trong response
// Dùng class-transformer @Exclude() trên field password
@Exclude()
password: string;
```

### R2: Refresh Token Storage
```typescript
// Lưu hash của RT, không lưu raw
const hashedRt = await bcrypt.hash(refreshToken, 10);
user.refreshToken = hashedRt;
```

### R3: Ownership Check
```typescript
// Trước khi cho user access resource
if (resource.userId !== currentUserId) throw new ForbiddenException();
```

---

## Anti-patterns

| Sai | Đúng |
|---|---|
| Return user object có password | Dùng @Exclude() hoặc select fields |
| Lưu raw refresh token | Lưu hash |
| Admin endpoint không có @Roles guard | Luôn guard admin routes |
